import imagekit from "../confiq/imagekit.js";

export const uploadFileToImageKit = async (
    file,
    folder = "uploads"
) => {

    const response =
        await imagekit.upload({
            file: file.buffer,
            fileName:
                `${Date.now()}-${file.originalname}`,
            folder
        });

    return {
        url: response.url,
        fileId: response.fileId
    };
};