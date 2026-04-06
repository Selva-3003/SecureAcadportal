const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models object to export
const models = {};

// Default MongoDB URI (for local development or testing if .env is missing)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/acadportal';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas / Local'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 1. User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['student', 'faculty', 'admin'] },
    student_id: { type: String },
    department: { type: String },
    avatar: { type: String },
    is_suspended: { type: Boolean, default: false },
    warning_count: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.User = mongoose.model('User', userSchema);

// 2. Announcement Schema
const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    priority: { type: String, default: 'normal', enum: ['low', 'normal', 'high', 'urgent'] },
    created_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.Announcement = mongoose.model('Announcement', announcementSchema);

// 3. Message Schema
const messageSchema = new mongoose.Schema({
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    content: { type: String, required: true },
    file_url: { type: String },
    is_filtered: { type: Boolean, default: false },
    filter_reason: { type: String },
    created_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.Message = mongoose.model('Message', messageSchema);

// 4. Assignment Schema
const assignmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    deadline: { type: Date, required: true },
    max_marks: { type: Number, default: 100 },
    created_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.Assignment = mongoose.model('Assignment', assignmentSchema);

// 5. Submission Schema
const submissionSchema = new mongoose.Schema({
    assignment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file_url: { type: String },
    status: { type: String, default: 'submitted', enum: ['submitted', 'graded', 'late'] },
    marks: { type: Number },
    feedback: { type: String },
    submitted_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.Submission = mongoose.model('Submission', submissionSchema);

// 6. Leave Schema
const leaveSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
    remarks: { type: String },
    faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.Leave = mongoose.model('Leave', leaveSchema);

// 7. StudentMark Schema
const studentMarkSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    marks: { type: Number, required: true },
    max_marks: { type: Number, default: 100 },
    semester: { type: String, required: true },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updated_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.StudentMark = mongoose.model('StudentMark', studentMarkSchema);

// 8. Project Schema
const projectSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    progress: { type: Number, default: 0 },
    status: { type: String, default: 'ongoing', enum: ['ongoing', 'completed', 'on-hold'] },
    faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updated_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.Project = mongoose.model('Project', projectSchema);

// 9. Warning Schema
const warningSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    reason: { type: String },
    created_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.Warning = mongoose.model('Warning', warningSchema);

// 10. Group Schema
const groupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of User ObjectIds
    created_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.Group = mongoose.model('Group', groupSchema);

// 11. Event Schema
const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    event_date: { type: String, required: true },
    event_type: { type: String, default: 'general' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.Event = mongoose.model('Event', eventSchema);

// 12. LoginAttempt Schema
const loginAttemptSchema = new mongoose.Schema({
    email: { type: String, required: true },
    ip: { type: String },
    success: { type: Boolean, default: false },
    attempted_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema);

// 13. ActivityLog Schema
const activityLogSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    user_name: { type: String },
    action: { type: String, required: true },
    details: { type: String },
    ip: { type: String },
    created_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// 14. SpamTracker Schema
const spamTrackerSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    last_message: { type: String },
    repeat_count: { type: Number, default: 1 },
    muted_until: { type: Date },
    updated_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.SpamTracker = mongoose.model('SpamTracker', spamTrackerSchema);

// 15. SecurityAlert Schema
const securityAlertSchema = new mongoose.Schema({
    alert_type: { type: String, required: true },
    severity: { type: String, default: 'medium', enum: ['low', 'medium', 'high', 'critical'] },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    details: { type: String },
    resolved: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
models.SecurityAlert = mongoose.model('SecurityAlert', securityAlertSchema);


// Seed function equivalent for MongoDB
async function seedDefaultData() {
    try {
        const adminCount = await models.User.countDocuments({ email: 'admin@portal.edu' });
        if (adminCount === 0) {
            console.log('Seeding initial MongoDB database...');
            
            const adminHash = bcrypt.hashSync('Admin@123', 10);
            const facHash = bcrypt.hashSync('Faculty@123', 10);
            const stuHash = bcrypt.hashSync('Student@123', 10);

            const adminObj = await models.User.create({ name: 'System Admin', email: 'admin@portal.edu', password: adminHash, role: 'admin', department: 'Administration' });
            
            const fac1 = await models.User.create({ name: 'Dr. Sarah Johnson', email: 'sarah.johnson@portal.edu', password: facHash, role: 'faculty', student_id: 'FAC001', department: 'Computer Science' });
            const fac2 = await models.User.create({ name: 'Prof. Michael Chen', email: 'michael.chen@portal.edu', password: facHash, role: 'faculty', student_id: 'FAC002', department: 'Mathematics' });

            const stu1 = await models.User.create({ name: 'Alex Thompson', email: 'alex.t@portal.edu', password: stuHash, role: 'student', student_id: 'STU001', department: 'Computer Science' });
            const stu2 = await models.User.create({ name: 'Priya Sharma', email: 'priya.s@portal.edu', password: stuHash, role: 'student', student_id: 'STU002', department: 'Computer Science' });
            const stu3 = await models.User.create({ name: 'James Wilson', email: 'james.w@portal.edu', password: stuHash, role: 'student', student_id: 'STU003', department: 'Mathematics' });

            await models.Announcement.create({ title: 'Welcome to Spring Semester 2024', content: 'Welcome back! Classes begin on January 15th.', author_id: fac1._id, priority: 'high' });
            await models.Announcement.create({ title: 'Mid-term Examination Schedule', content: 'Mid-term exams are scheduled for March 10-14.', author_id: fac1._id, priority: 'urgent' });
            await models.Announcement.create({ title: 'Assignment Submission Reminder', content: 'All pending assignments must be submitted by this Friday.', author_id: fac2._id, priority: 'normal' });

            await models.Assignment.create({ title: 'Data Structures Assignment #3', description: 'Implement a binary search tree.', faculty_id: fac1._id, subject: 'Data Structures', deadline: new Date('2024-03-20T23:59:00Z'), max_marks: 100 });
            await models.Assignment.create({ title: 'Calculus Problem Set 5', description: 'Solve problems on integration techniques.', faculty_id: fac2._id, subject: 'Calculus', deadline: new Date('2024-03-18T23:59:00Z'), max_marks: 50 });

            await models.StudentMark.create({ student_id: stu1._id, subject: 'Data Structures', marks: 85, max_marks: 100, semester: 'Sem 4', updated_by: fac1._id });
            await models.StudentMark.create({ student_id: stu1._id, subject: 'Algorithms', marks: 90, max_marks: 100, semester: 'Sem 4', updated_by: fac1._id });

            await models.Project.create({ student_id: stu1._id, title: 'AI-Powered Academic Portal', progress: 75, status: 'ongoing', faculty_id: fac1._id });
            await models.Event.create({ title: 'Annual Tech Symposium', description: 'Annual technology symposium open to all.', event_date: '2024-03-25', event_type: 'event', created_by: adminObj._id });

            const group = await models.Group.create({ name: 'CS Batch 2024 - Data Structures', description: 'Group for DS', created_by: fac1._id, members: [fac1._id, stu1._id, stu2._id] });

            console.log('✅ MongoDB database seeded with sample data');
        }
    } catch (error) {
        console.error('Seed Error:', error);
    }
}

// Ensure the connection is open before seeding
mongoose.connection.once('open', seedDefaultData);

module.exports = models;
