import multer from "multer";

const storage = multer.memoryStorage();

export const singleUpload = multer({ storage }).single("file"); // or 'avatar', depending on your field name
 
