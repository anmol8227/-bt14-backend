const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { SECURITY_QUESTIONS } = require('../models/User');


// ─── Generate JWT Token ─────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};


// ═════════════════════════════════════════════
// GET SECURITY QUESTIONS
// ═════════════════════════════════════════════
router.get('/security-questions', (req, res) => {
  res.json({
    success: true,
    questions: SECURITY_QUESTIONS.map((q, i) => ({
      index: i,
      question: q,
    })),
  });
});


// ═════════════════════════════════════════════
// REGISTER — Security questions removed
// ═════════════════════════════════════════════
router.post('/register', [

  body('name').notEmpty().withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),

], async (req, res) => {

  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success:false, errors:errors.array() });
    }

    const { name, email, password, adminKey } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success:false,
        message:"Email already registered"
      });
    }

    // Default role
    let role = "citizen";

    // Admin key verification
    if (adminKey) {
      if (adminKey !== process.env.ADMIN_REGISTRATION_KEY) {
        return res.status(403).json({
          success:false,
          message:"Invalid Admin Key"
        });
      }
      role = "admin";
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    sendTokenResponse(user, 201, res);

  } catch(err) {

    console.error(err);
    res.status(500).json({
      success:false,
      message:"Registration failed"
    });

  }

});


// ═════════════════════════════════════════════
// LOGIN
// ═════════════════════════════════════════════
router.post('/login',[

  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),

], async (req,res)=>{

  try{

    const errors = validationResult(req);

    if(!errors.isEmpty()){
      return res.status(400).json({
        success:false,
        errors:errors.array()
      });
    }

    const { email,password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if(!user){
      return res.status(401).json({
        success:false,
        message:"Invalid email or password"
      });
    }

    const isMatch = await user.comparePassword(password);

    if(!isMatch){
      return res.status(401).json({
        success:false,
        message:"Invalid email or password"
      });
    }

    sendTokenResponse(user,200,res);

  }catch(err){

    res.status(500).json({
      success:false,
      message:"Login failed"
    });

  }

});


// ═════════════════════════════════════════════
// FORGOT PASSWORD STEP 1
// ═════════════════════════════════════════════
router.post('/forgot-password',[

  body('email').isEmail().withMessage('Valid email required')

], async(req,res)=>{

  try{

    const { email } = req.body;

    const user = await User.findOne({ email });

    res.json({
      success:true,
      questions: SECURITY_QUESTIONS.map((q,i)=>({
        index:i,
        question:q
      })),
      userId: user ? user._id : null
    });

  }catch(err){

    res.status(500).json({
      success:false,
      message:"Error"
    });

  }

});


// ═════════════════════════════════════════════
// VERIFY SECURITY ANSWERS
// ═════════════════════════════════════════════
router.post('/forgot-password/verify', async(req,res)=>{

  try{

    const { userId,answers } = req.body;

    const user = await User.findById(userId).select('+securityAnswers');

    if(!user){
      return res.status(404).json({
        success:false,
        message:"User not found"
      });
    }

    const results = await Promise.all(
      answers.map((ans,idx)=> user.compareSecurityAnswer(idx,ans))
    );

    const allCorrect = results.every(Boolean);

    if(!allCorrect){
      return res.status(400).json({
        success:false,
        message:"Wrong answers"
      });
    }

    const resetToken = jwt.sign(
      { id:user._id,purpose:"reset-password" },
      process.env.JWT_SECRET,
      { expiresIn:"10m" }
    );

    res.json({
      success:true,
      resetToken
    });

  }catch(err){

    res.status(500).json({
      success:false,
      message:"Verification failed"
    });

  }

});


// ═════════════════════════════════════════════
// RESET PASSWORD
// ═════════════════════════════════════════════
router.post('/reset-password', async(req,res)=>{

  try{

    const { resetToken,newPassword } = req.body;

    const decoded = jwt.verify(resetToken,process.env.JWT_SECRET);

    if(decoded.purpose !== "reset-password"){
      return res.status(400).json({
        success:false,
        message:"Invalid reset token"
      });
    }

    const user = await User.findById(decoded.id);

    if(!user){
      return res.status(404).json({
        success:false,
        message:"User not found"
      });
    }

    user.password = newPassword;

    await user.save();

    res.json({
      success:true,
      message:"Password reset successful"
    });

  }catch(err){

    res.status(400).json({
      success:false,
      message:"Reset token expired"
    });

  }

});


// ═════════════════════════════════════════════
// CURRENT USER
// ═════════════════════════════════════════════
router.get('/me',protect,(req,res)=>{

  res.json({
    success:true,
    user:req.user
  });

});


module.exports = router;
