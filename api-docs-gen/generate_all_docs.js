const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = require('docx');

const baseDir = path.join('d:', 'rambhaji', 'Backend');
const routesDir = path.join(baseDir, 'routes');
const controllersDir = path.join(baseDir, 'controllers');

// Function to extract auth info
function getAuthInfo(routeLine) {
    if (routeLine.includes('requireAuth') && routeLine.includes('requireRole(["admin"])')) return "✅ Admin Only (Bearer Token Required)";
    if (routeLine.includes('requireAuth') && routeLine.includes('requireRole(["delivery", "admin"])')) return "✅ Admin/Delivery Only (Bearer Token Required)";
    if (routeLine.includes('requireAuth') && routeLine.includes('requireRole(["user"])')) return "✅ User Only (Bearer Token Required)";
    if (routeLine.includes('requireAuth')) return "✅ JWT Required (Bearer Token)";
    return "✅ No Authentication Required";
}

// Simple logic generator
function generateBusinessLogic(method, url, models) {
    let text = `Handles ${method} requests to ${url}. `;
    if (models.length > 0) {
        text += `Interacts with database models: ${models.join(', ')}. `;
    }
    if (method === 'POST') text += "Validates input payload, creates a new record in the database, and returns the created object.";
    if (method === 'GET') text += "Fetches records from the database based on query parameters or user authentication context.";
    if (method === 'PUT' || method === 'PATCH') text += "Finds the existing record, updates its fields with the provided payload, and saves it.";
    if (method === 'DELETE') text += "Finds the existing record and removes it from the database (or marks it as deleted).";
    return text;
}

const apis = [];

// Parse all routes
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
for (const rf of routeFiles) {
    const routeContent = fs.readFileSync(path.join(routesDir, rf), 'utf8');
    const controllerName = rf.replace('.route.js', '.controller.js');
    let controllerContent = "";
    if (fs.existsSync(path.join(controllersDir, controllerName))) {
        controllerContent = fs.readFileSync(path.join(controllersDir, controllerName), 'utf8');
    }

    const lines = routeContent.split('\n');
    let currentModule = rf.replace('.route.js', '').toUpperCase();
    let moduleApis = [];
    
    // Check for global router.use middlewares
    let globalAuth = "";
    lines.forEach(l => {
        if (l.includes('router.use(') && l.includes('requireAuth')) {
            globalAuth = getAuthInfo(l);
        }
    });

    lines.forEach(line => {
        if (!line.includes('router.')) return;
        const match = line.match(/router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["'](.*)\)/);
        if (match) {
            const method = match[1].toUpperCase();
            let url = `/api/${rf.replace('.route.js', '') === 'auth' ? 'auth' : rf.replace('.route.js', '')}${match[2]}`.replace(/\/+/g, '/');
            if (url.endsWith('/')) url = url.slice(0, -1);
            if(url.includes('/api/api/')) url = url.replace('/api/api/', '/api/');

            const argsMatch = match[3]; // Everything after the URL
            const functionNameMatch = argsMatch.match(/([a-zA-Z0-9_]+)\s*$/);
            if (!functionNameMatch) return;
            const funcName = functionNameMatch[1];
            
            let auth = getAuthInfo(line);
            if (auth === "✅ No Authentication Required" && globalAuth) {
                auth = globalAuth;
            }

            // Extract req body/query/params from controller
            let requestBody = [];
            let queryParams = [];
            let urlParams = [];
            let models = new Set();
            let successResp = { success: true };
            let errorCodes = ["500", "400"];
            
            // Extract URL params
            const paramMatches = url.match(/:[a-zA-Z_]+/g);
            if (paramMatches) {
                paramMatches.forEach(p => {
                    urlParams.push({ field: p, type: "String/Number", req: "Yes", desc: `Path parameter ${p}` });
                });
            }

            // Very basic AST extraction by matching controller function body
            let bodyStr = "";
            try {
                // Find start of function
                const funcIdx = controllerContent.indexOf(`export const ${funcName} =`);
                if (funcIdx !== -1) {
                    const nextExport = controllerContent.indexOf('export const', funcIdx + 10);
                    if (nextExport !== -1) {
                        bodyStr = controllerContent.substring(funcIdx, nextExport);
                    } else {
                        bodyStr = controllerContent.substring(funcIdx);
                    }
                }
            } catch(e) {}
            
            if (bodyStr) {
                // Extract models (Capitalized words followed by .)
                const modelMatches = bodyStr.match(/\b([A-Z][a-z0-9_]+)\.(findOne|findAll|create|update|destroy|count|findByPk|bulkCreate)/g);
                if (modelMatches) {
                    modelMatches.forEach(m => models.add(m.split('.')[0]));
                }
                
                // Extract req.body
                const bodyMatch = bodyStr.match(/const\s+{([^}]+)}\s*=\s*req\.body/);
                if (bodyMatch) {
                    const fields = bodyMatch[1].split(',').map(s => s.trim().split(':')[0].trim()).filter(s => s);
                    fields.forEach(f => requestBody.push({ field: f, type: "Any", req: "Depends", desc: `Payload field ${f}` }));
                }

                // Extract req.query
                const queryMatch = bodyStr.match(/const\s+{([^}]+)}\s*=\s*req\.query/);
                if (queryMatch) {
                    const fields = queryMatch[1].split(',').map(s => s.trim().split(':')[0].trim()).filter(s => s);
                    fields.forEach(f => queryParams.push({ field: f, type: "String", req: "No", desc: `Query param ${f}` }));
                }
                
                // Extract 404
                if (bodyStr.includes('404')) errorCodes.push("404");
                // Extract 401/403
                if (bodyStr.includes('401')) errorCodes.push("401");
                if (bodyStr.includes('403')) errorCodes.push("403");
            }

            moduleApis.push({
                name: `${funcName} API`,
                method,
                url,
                description: `This API handles the ${funcName} operation.`,
                auth,
                businessLogic: generateBusinessLogic(method, url, Array.from(models)),
                models: Array.from(models),
                requestBody,
                queryParams,
                urlParams,
                errorCodes: Array.from(new Set(errorCodes))
            });
        }
    });

    if (moduleApis.length > 0) {
        apis.push({ module: currentModule, endpoints: moduleApis });
    }
}

// Generate the docx
function createTable(headers, rows) {
    if (rows.length === 0) return new Paragraph({ text: "None", italics: true });
    
    const headerRow = new TableRow({
        children: headers.map(h => new TableCell({ children: [new Paragraph({ text: h, bold: true })] })),
    });

    const tableRows = rows.map(r => new TableRow({
        children: Object.values(r).map(v => new TableCell({ children: [new Paragraph(v || "-")] })),
    }));

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...tableRows],
    });
}

const docChildren = [
    new Paragraph({ text: "FreshBox Backend API Documentation", heading: HeadingLevel.TITLE, alignment: "center" }),
    new Paragraph({ text: "Generated automatically by backend analysis tool.", spacing: { after: 400 }, alignment: "center" })
];

apis.forEach(mod => {
    docChildren.push(new Paragraph({ text: `Module: ${mod.module}`, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }));

    mod.endpoints.forEach((ep, index) => {
        docChildren.push(new Paragraph({ text: `${index + 1}. ${ep.name}`, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
        docChildren.push(new Paragraph({ children: [new TextRun({ text: "Method: ", bold: true }), new TextRun(ep.method)] }));
        docChildren.push(new Paragraph({ children: [new TextRun({ text: "URL: ", bold: true }), new TextRun(`https://ranbhaji.onrender.com${ep.url}`)] }));
        docChildren.push(new Paragraph({ children: [new TextRun({ text: "Authentication: ", bold: true }), new TextRun(ep.auth)], spacing: { after: 100 } }));
        
        docChildren.push(new Paragraph({ children: [new TextRun({ text: "Purpose: ", bold: true }), new TextRun(ep.description)], spacing: { after: 100 } }));
        docChildren.push(new Paragraph({ children: [new TextRun({ text: "Business Logic: ", bold: true }), new TextRun(ep.businessLogic)], spacing: { after: 100 } }));
        
        if (ep.models.length > 0) {
            docChildren.push(new Paragraph({ children: [new TextRun({ text: "Database Models Used: ", bold: true }), new TextRun(ep.models.join(', '))], spacing: { after: 100 } }));
        }

        if (ep.urlParams.length > 0) {
            docChildren.push(new Paragraph({ text: "URL Parameters:", bold: true }));
            docChildren.push(createTable(["Parameter", "Type", "Required", "Description"], ep.urlParams));
        }

        if (ep.queryParams.length > 0) {
            docChildren.push(new Paragraph({ text: "Query Parameters:", bold: true, spacing: { before: 100 } }));
            docChildren.push(createTable(["Parameter", "Type", "Required", "Description"], ep.queryParams));
        }

        if (ep.requestBody.length > 0) {
            docChildren.push(new Paragraph({ text: "Request Payload:", bold: true, spacing: { before: 100 } }));
            docChildren.push(createTable(["Field", "Type", "Required", "Description"], ep.requestBody));
        }

        docChildren.push(new Paragraph({ children: [new TextRun({ text: "Possible Error Codes: ", bold: true }), new TextRun(ep.errorCodes.join(', '))], spacing: { before: 100, after: 300 } }));
        docChildren.push(new Paragraph({ text: "------------------------------------------------------", alignment: "center" }));
    });
});

const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(path.join(__dirname, "Final_API_Documentation.docx"), buffer);
    console.log("Document generated successfully! Check Final_API_Documentation.docx");
});
