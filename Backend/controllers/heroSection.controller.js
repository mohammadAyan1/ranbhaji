import { HeroSection } from "../models/index.js";
import path from "path";
import fs from "fs";

const formatHeroResponse = (hero, req) => {
    if (!hero) return null;
    const plain = hero.toJSON ? hero.toJSON() : { ...hero };

    // Construct absolute image URL
    let fullUrl = plain.image_url || '';
    if (fullUrl && !fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.get('host') || 'localhost:3000';
        const cleanPath = fullUrl.startsWith('/') ? fullUrl : `/${fullUrl}`;
        fullUrl = `${protocol}://${host}${cleanPath}`;
    }

    return {
        id: plain.id,
        badge_text: plain.badge_text,
        title: plain.title,
        description: plain.description,
        image_url: plain.image_url,
        image_full_url: fullUrl,
        button_text: plain.button_text,
        button_link: plain.button_link,
        is_active: plain.is_active,
        order: plain.order,
        updated_at: plain.updated_at,
        created_at: plain.created_at
    };
};

// GET /api/hero-section (Public for Next.js website)
export const getPublicHeroSection = async (req, res) => {
    try {
        const banners = await HeroSection.findAll({
            where: { is_active: true },
            order: [['order', 'ASC'], ['id', 'DESC']]
        });

        // If no hero section exists in DB, auto-seed default
        if (banners.length === 0) {
            const seedHero = await HeroSection.create({
                badge_text: 'MANGO SEASON SPECIAL',
                title: 'Dashheri & Langra have arrived',
                description: 'Bring home naturally sweet fruits and pesticide-free vegetables, sorted fresh and delivered with care.',
                image_url: '/uploads/hero-banner-mango.jpg',
                button_text: 'Shop Now',
                button_link: '/products',
                is_active: true,
                order: 0
            });
            banners.push(seedHero);
        }

        const formattedList = banners.map(b => formatHeroResponse(b, req));
        const activeHero = formattedList[0];

        res.status(200).json({
            success: true,
            hero: activeHero,
            banners: formattedList, // Array of ALL active banners (for slider/carousel)
            count: formattedList.length,
            data: activeHero
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/hero-section/all (Admin list of all hero banners: active and inactive)
export const getAllHeroSections = async (req, res) => {
    try {
        const banners = await HeroSection.findAll({
            order: [['order', 'ASC'], ['id', 'DESC']]
        });
        const formattedList = banners.map(b => formatHeroResponse(b, req));
        res.status(200).json({ success: true, count: banners.length, banners: formattedList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/hero-section (Create NEW) or PUT /api/hero-section/:id (Update existing)
export const saveHeroSection = async (req, res) => {
    try {
        const { id, badge_text, title, description, button_text, button_link, is_active, order } = req.body;
        const targetId = id || req.params.id;

        let hero = null;
        if (targetId) {
            hero = await HeroSection.findByPk(targetId);
            if (!hero) {
                return res.status(404).json({ success: false, message: `Hero banner #${targetId} not found` });
            }
        }

        let newImageUrl = undefined;
        if (req.file) {
            newImageUrl = `/uploads/${req.file.filename}`;
            // If replacing previous image and it's not the default seed, safely unlink old image
            if (hero && hero.image_url && hero.image_url.startsWith('/uploads/') && !hero.image_url.includes('hero-banner-mango.jpg')) {
                const oldPath = path.join(process.cwd(), hero.image_url);
                if (fs.existsSync(oldPath)) {
                    try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
                }
            }
        } else if (req.body.image_url) {
            newImageUrl = req.body.image_url;
        }

        const isUpdating = !!hero;

        if (hero) {
            // Update existing banner
            await hero.update({
                badge_text: badge_text !== undefined ? badge_text : hero.badge_text,
                title: title !== undefined ? title : hero.title,
                description: description !== undefined ? description : hero.description,
                image_url: newImageUrl !== undefined ? newImageUrl : hero.image_url,
                button_text: button_text !== undefined ? button_text : hero.button_text,
                button_link: button_link !== undefined ? button_link : hero.button_link,
                is_active: is_active !== undefined ? (is_active === 'true' || is_active === true) : hero.is_active,
                order: order !== undefined ? Number(order) : hero.order
            });
        } else {
            // Create NEW banner
            hero = await HeroSection.create({
                badge_text: badge_text || 'SEASON SPECIAL',
                title: title || 'Fresh Arrivals',
                description: description || 'Bring home fresh naturally grown fruits and vegetables, sorted fresh and delivered with care.',
                image_url: newImageUrl || '/uploads/hero-banner-mango.jpg',
                button_text: button_text || 'Shop Now',
                button_link: button_link || '/products',
                is_active: is_active !== undefined ? (is_active === 'true' || is_active === true) : true,
                order: order !== undefined ? Number(order) : 0
            });
        }

        const formatted = formatHeroResponse(hero, req);

        res.status(200).json({
            success: true,
            message: isUpdating ? "Hero banner updated successfully" : "New hero banner created successfully",
            hero: formatted,
            data: formatted
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/hero-section/:id
export const deleteHeroSection = async (req, res) => {
    try {
        const { id } = req.params;
        const hero = await HeroSection.findByPk(id);
        if (!hero) return res.status(404).json({ success: false, message: "Hero section not found" });

        if (hero.image_url && hero.image_url.startsWith('/uploads/') && !hero.image_url.includes('hero-banner-mango.jpg')) {
            const oldPath = path.join(process.cwd(), hero.image_url);
            if (fs.existsSync(oldPath)) {
                try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
            }
        }

        await hero.destroy();
        res.status(200).json({ success: true, message: "Hero section deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/hero-section/:id/status
export const toggleHeroStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const hero = await HeroSection.findByPk(id);
        if (!hero) return res.status(404).json({ success: false, message: "Hero section not found" });

        hero.is_active = !hero.is_active;
        await hero.save();

        res.status(200).json({
            success: true,
            message: `Hero section ${hero.is_active ? 'activated' : 'deactivated'}`,
            is_active: hero.is_active
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
