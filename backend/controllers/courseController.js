const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// @route POST /api/courses  (faculty)
const createCourse = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const course = await Course.create({
      title,
      description,
      category,
      faculty: req.user.id,
      modules: [],
    });
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create course', error: err.message });
  }
};

// @route GET /api/courses  (published only, unless faculty/admin requesting their own)
const listCourses = async (req, res) => {
  try {
    const filter = req.user?.role === 'faculty' ? { faculty: req.user.id } : { published: true };
    const courses = await Course.find(filter).populate('faculty', 'name').select('-modules.lessons.contentUrl');
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch courses', error: err.message });
  }
};

// @route GET /api/courses/:id
const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('faculty', 'name');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch course', error: err.message });
  }
};

// @route PUT /api/courses/:id  (faculty who owns it, or admin)
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (String(course.faculty) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit this course' });
    }
    Object.assign(course, req.body);
    await course.save();
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update course', error: err.message });
  }
};

// @route POST /api/courses/:id/modules  (faculty)
const addModule = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (String(course.faculty) !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { title, lessons } = req.body;
    course.modules.push({ title, lessons: lessons || [], order: course.modules.length });
    await course.save();
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add module', error: err.message });
  }
};

// @route POST /api/courses/:id/enroll  (student)
const enrollInCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course || !course.published) return res.status(404).json({ message: 'Course not available' });

    const existing = await Enrollment.findOne({ student: req.user.id, course: course._id });
    if (existing) return res.status(409).json({ message: 'Already enrolled' });

    const enrollment = await Enrollment.create({ student: req.user.id, course: course._id });
    res.status(201).json(enrollment);
  } catch (err) {
    res.status(500).json({ message: 'Failed to enroll', error: err.message });
  }
};

// @route POST /api/courses/:id/lessons/:lessonId/complete  (student)
const completeLesson = async (req, res) => {
  try {
    const { id: courseId, lessonId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const enrollment = await Enrollment.findOne({ student: req.user.id, course: courseId });
    if (!enrollment) return res.status(404).json({ message: 'Not enrolled in this course' });

    if (!enrollment.completedLessons.some((id) => String(id) === lessonId)) {
      enrollment.completedLessons.push(lessonId);
    }

    const total = course.totalLessonCount();
    enrollment.progressPercent = total > 0 ? Math.round((enrollment.completedLessons.length / total) * 100) : 0;
    if (enrollment.progressPercent >= 100 && !enrollment.completedAt) {
      enrollment.completedAt = new Date();
    }
    await enrollment.save();
    res.json(enrollment);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update progress', error: err.message });
  }
};

// @route GET /api/courses/:id/enrollment  (student's own progress in this course)
const getMyEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({ student: req.user.id, course: req.params.id });
    if (!enrollment) return res.status(404).json({ message: 'Not enrolled' });
    res.json(enrollment);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch enrollment', error: err.message });
  }
};

// @route PUT /api/courses/:id/modules/:moduleId/quiz  (faculty — attach an existing quiz to a module)
const attachQuizToModule = async (req, res) => {
  try {
    const { id: courseId, moduleId } = req.params;
    const { quizId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (String(course.faculty) !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const mod = course.modules.id(moduleId);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    // Confirm the quiz actually belongs to this course before attaching
    const Quiz = require('../models/Quiz');
    const quiz = await Quiz.findOne({ _id: quizId, course: courseId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found in this course' });

    mod.quiz = quiz._id;
    await course.save();
    await course.populate('faculty', 'name');
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Failed to attach quiz', error: err.message });
  }
};

// @route POST /api/courses/:id/modules/:moduleId/lessons  (faculty — add a lesson to an existing module)
const addLesson = async (req, res) => {
  try {
    const { id: courseId, moduleId } = req.params;
    const { title, contentType, contentUrl } = req.body;

    if (!title) return res.status(400).json({ message: 'Lesson title is required' });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (String(course.faculty) !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const mod = course.modules.id(moduleId);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    mod.lessons.push({
      title,
      contentType: contentType || 'text',
      contentUrl: contentUrl || '',
      order: mod.lessons.length,
    });

    await course.save();
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add lesson', error: err.message });
  }
};

// @route GET /api/courses/enrollments/mine  (student — list of course IDs they're enrolled in)
const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user.id }).select('course');
    res.json(enrollments.map((e) => e.course));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch enrollments', error: err.message });
  }
};

module.exports = {
  createCourse,
  listCourses,
  getCourse,
  updateCourse,
  addModule,
  addLesson,
  attachQuizToModule,
  enrollInCourse,
  completeLesson,
  getMyEnrollment,
  getMyEnrollments,
};