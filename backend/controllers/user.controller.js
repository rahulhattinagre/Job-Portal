import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from '../utils/cloudinary.js';



export const register = async (req, res) => {
    try {
        const { fullname, email, phoneNumber, password, role } = req.body;

        if (!fullname || !email || !phoneNumber || !password || !role) {
            return res.status(400).json({
                message: "All fields are required",
                success: false
            });
        };

        // Check if file exists
        if (!req.file) {
            return res.status(400).json({
                message: "Profile photo is required",
                success: false
            });
        }

        const file = req.file;

        // Get file data URI with error handling
        let fileUri;
        try {
            fileUri = getDataUri(file);
        } catch (error) {
            return res.status(400).json({
                message: "Invalid file: " + error.message,
                success: false
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: 'User already exists with this email.',
                success: false,
            });
        }

        // Upload to Cloudinary
        let cloudResponse;
        try {
            // Use fileUri directly if using the datauri package version
            // Or use fileUri.dataUri if using the alternative version
            cloudResponse = await cloudinary.uploader.upload(fileUri.dataUri, {
                folder: "jobportal",
            });

        } catch (cloudError) {
            console.error('Cloudinary error:', cloudError);
            return res.status(500).json({
                message: "Failed to upload profile photo",
                success: false
            });
        }

        // Create user
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            fullname,
            email,
            phoneNumber,
            password: hashedPassword,
            role,
            profile: {
                profilePhoto: cloudResponse.secure_url,
            }
        });

        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        });
    } catch (error) {
        console.log("Registration error:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({
                message: "All fields are required",
                success: false
            });
        };

        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            });
        };

        // Check role
        if (role !== user.role) {
            return res.status(400).json({
                message: "Account doesn't exist with current role.",
                success: false
            });
        };

        const tokenData = {
            userId: user._id
        };

        const token = await jwt.sign(tokenData, process.env.JWT_SECRET || process.env.SECRET_KEY, { expiresIn: '1d' });

        const userResponse = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        };

        return res.status(200)
            .cookie("token", token, {
                maxAge: 1 * 24 * 60 * 60 * 1000,
                httpOnly: true, // Fixed: should be httpOnly, not httpsOnly
                sameSite: 'strict'
            })
            .json({
                message: `Welcome back ${user.fullname}`,
                user: userResponse,
                success: true
            });
    } catch (error) {
        console.log("Login error:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

export const logout = async (req, res) => {
    try {
        return res.status(200)
            .cookie("token", "", { maxAge: 0 })
            .json({
                message: "Logged out successfully.",
                success: true
            });
    } catch (error) {
        console.log("Logout error:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

export const updateProfile = async (req, res) => {
    try {
        const { fullname, email, phoneNumber, bio, skills } = req.body;
        const userId = req.id; // from authentication middleware

        let user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({
                message: "User not found.",
                success: false
            });
        }

        let cloudResponse;
        // Only process file if one was uploaded
        if (req.file) {
            const file = req.file;
            const fileUri = getDataUri(file);

            cloudResponse = await cloudinary.uploader.upload(fileUri.dataUri, {
                folder: "jobportal",
            });

        }

        let skillsArray;
        if (skills) {
            skillsArray = skills.split(",").map(skill => skill.trim());
        }

        // Update user data
        if (fullname) user.fullname = fullname;
        if (email) user.email = email;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (bio) user.profile.bio = bio;
        if (skills) user.profile.skills = skillsArray;

        // Update profile photo if new one was uploaded
        if (cloudResponse) {
            user.profile.profilePhoto = cloudResponse.secure_url;
        }

        await user.save();

        const userResponse = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        };

        return res.status(200).json({
            message: "Profile updated successfully.",
            user: userResponse,
            success: true
        });
    } catch (error) {
        console.log("Update profile error:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}