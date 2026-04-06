// Academic keyword filter for message moderation
const ACADEMIC_KEYWORDS = [
    'assignment', 'project', 'exam', 'class', 'marks', 'attendance', 'submission',
    'lecture', 'notes', 'study', 'grade', 'semester', 'course', 'subject', 'topic',
    'homework', 'deadline', 'quiz', 'test', 'research', 'lab', 'practical', 'theory',
    'faculty', 'professor', 'student', 'university', 'college', 'department', 'syllabus',
    'textbook', 'reference', 'citation', 'thesis', 'dissertation', 'presentation',
    'report', 'feedback', 'evaluation', 'assessment', 'score', 'result', 'cgpa', 'gpa',
    'leave', 'absent', 'present', 'schedule', 'timetable', 'question', 'answer', 'doubt',
    'explanation', 'concept', 'formula', 'solution', 'problem', 'exercise', 'chapter',
    'upload', 'download', 'file', 'document', 'pdf', 'slide', 'material', 'resource',
    'meeting', 'session', 'virtual', 'zoom', 'group', 'team', 'collaboration', 'discussion',
    'help', 'clarify', 'understand', 'learn', 'teach', 'explain', 'review', 'prepare',
    'complete', 'finish', 'submit', 'approve', 'reject', 'pending', 'progress', 'update',
    'hello', 'hi', 'good morning', 'good evening', 'please', 'thank', 'thanks', 'sir', 'mam',
    'ma am', 'madam', 'respected', 'regarding', 'kindly', 'request', 'inform', 'notify'
];

const BLOCKED_PATTERNS = [
    /\b(fuck|shit|ass|bitch|damn|crap|wtf|lol|lmao|haha|hehe|rofl)\b/i,
    /\b(date|hangout|party|movie|game|play|fun|joke|meme|funny)\b/i,
    /\b(girlfriend|boyfriend|love|crush|date|flirt|romance)\b/i,
    /\b(whatsapp|instagram|snapchat|tiktok|facebook|twitter)\b/i,
];

function filterMessage(content) {
    if (!content || content.trim().length === 0) {
        return { allowed: false, reason: 'Empty message' };
    }

    const lower = content.toLowerCase();

    // Check blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(lower)) {
            return { allowed: false, reason: 'Message contains inappropriate or non-academic content' };
        }
    }

    // Check if contains at least one academic keyword (for long messages)
    if (content.length > 30) {
        const hasAcademic = ACADEMIC_KEYWORDS.some(kw => lower.includes(kw));
        if (!hasAcademic) {
            return { allowed: false, reason: 'Message does not appear to be academic in nature' };
        }
    }

    return { allowed: true };
}

module.exports = { filterMessage };
