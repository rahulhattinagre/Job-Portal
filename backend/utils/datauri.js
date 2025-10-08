import DataUriParser from "datauri/parser.js"
import path from "path";

const getDataUri = (file) => {
    // Error handling
    if (!file) {
        throw new Error('No file provided');
    }
    
    if (!file.originalname || !file.buffer) {
        throw new Error('Invalid file object');
    }

    // Get file extension
    const ext = file.originalname.split('.').pop();
    
    // Create data URI manually
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    
    return {
        dataUri: dataUri,
        ext: ext
    };
}

export default getDataUri;