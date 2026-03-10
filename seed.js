// seed.js — Run: node seed.js
// Populates database with demo admin, citizen, and sample feedbacks

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/bt14_civic_portal";

// Inline minimal schemas for seed script
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true },
  password: String, role: { type: String, default: "citizen" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

UserSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const FeedbackSchema = new mongoose.Schema({
  issueId: String, category: String, rating: Number, nps: Number,
  satisfied: Boolean, tags: [String], comment: String, resolution: String,
  status: String, daysToResolve: Number,
  citizen: mongoose.Schema.Types.ObjectId, citizenName: String,
}, { timestamps: true });

const User     = mongoose.model("User", UserSchema);
const Feedback = mongoose.model("Feedback", FeedbackSchema);

const CATEGORIES = ["roads","water","waste","street","parks","safety"];
const SAMPLE_FEEDBACKS = [
  { issueId:"CIR-2024101", category:"roads",  rating:5, nps:9,  satisfied:true,  daysToResolve:2,  status:"Resolved",          comment:"Pothole on MG Road fixed within 2 days. Excellent!", tags:["Fast resolution","Staff was helpful","Issue fully fixed"] },
  { issueId:"CIR-2024102", category:"water",  rating:3, nps:6,  satisfied:false, daysToResolve:8,  status:"Partially Resolved", comment:"Drainage issue partially fixed, still some leakage.", tags:["Professional service"] },
  { issueId:"CIR-2024103", category:"street", rating:5, nps:10, satisfied:true,  daysToResolve:1,  status:"Resolved",          comment:"Street light replaced same day. Very impressed!", tags:["Fast resolution","Communication clear"] },
  { issueId:"CIR-2024104", category:"waste",  rating:4, nps:8,  satisfied:true,  daysToResolve:3,  status:"Resolved",          comment:"Waste management team was prompt and professional.", tags:["Communication clear","Staff was helpful"] },
  { issueId:"CIR-2024105", category:"parks",  rating:2, nps:3,  satisfied:false, daysToResolve:15, status:"Escalated",         comment:"Park cleanliness issue not fully resolved.", tags:[] },
  { issueId:"CIR-2024106", category:"safety", rating:5, nps:9,  satisfied:true,  daysToResolve:2,  status:"Resolved",          comment:"CCTV issue resolved quickly. Feel safer now.", tags:["Fast resolution","Issue fully fixed"] },
  { issueId:"CIR-2024107", category:"roads",  rating:4, nps:8,  satisfied:true,  daysToResolve:4,  status:"Resolved",          comment:"Good work on the road repair. Smooth now.", tags:["Staff was helpful","Thorough work"] },
  { issueId:"CIR-2024108", category:"water",  rating:5, nps:10, satisfied:true,  daysToResolve:1,  status:"Resolved",          comment:"Water supply issue resolved in 1 day. Excellent service!", tags:["Fast resolution","Follow-up received"] },
  { issueId:"CIR-2024109", category:"waste",  rating:3, nps:5,  satisfied:false, daysToResolve:10, status:"Partially Resolved", comment:"Garbage cleared but timing is irregular.", tags:[] },
  { issueId:"CIR-2024110", category:"parks",  rating:5, nps:9,  satisfied:true,  daysToResolve:5,  status:"Resolved",          comment:"Park benches replaced. Kids love it now!", tags:["Fast resolution","Issue fully fixed","Easy to submit"] },
];

async function seed() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected!\n");

    // Clear existing data
    await User.deleteMany({});
    await Feedback.deleteMany({});
    console.log("🗑️  Cleared existing data\n");

    // Create Admin
    const admin = await User.create({
      name: "Admin BT14", email: "admin@bt14.gov",
      password: "admin123", role: "admin",
    });
    console.log("✅ Admin created:   admin@bt14.gov / admin123");

    // Create Citizens
    const citizen1 = await User.create({
      name: "Rahul Sharma", email: "citizen@bt14.gov",
      password: "citizen123", role: "citizen",
    });
    console.log("✅ Citizen created: citizen@bt14.gov / citizen123");

    const citizen2 = await User.create({
      name: "Priya Singh", email: "priya@example.com",
      password: "priya123", role: "citizen",
    });
    console.log("✅ Citizen created: priya@example.com / priya123");

    // Create sample feedbacks
    const citizens = [citizen1, citizen2];
    for (let i = 0; i < SAMPLE_FEEDBACKS.length; i++) {
      const c = citizens[i % 2];
      await Feedback.create({
        ...SAMPLE_FEEDBACKS[i],
        citizen: c._id,
        citizenName: c.name,
      });
    }
    console.log(`✅ Created ${SAMPLE_FEEDBACKS.length} sample feedbacks\n`);

    console.log("══════════════════════════════════════");
    console.log("  🎉 Seed completed successfully!");
    console.log("══════════════════════════════════════");
    console.log("  Admin:   admin@bt14.gov / admin123");
    console.log("  Citizen: citizen@bt14.gov / citizen123");
    console.log("══════════════════════════════════════\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err.message);
    process.exit(1);
  }
}

seed();
