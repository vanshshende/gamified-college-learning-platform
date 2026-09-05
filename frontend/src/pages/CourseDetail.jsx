import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [error, setError] = useState('');

  // Faculty: add-module form
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');

  // Faculty: AI quiz generator form
  const [aiForm, setAiForm] = useState({ title: '', topicOrText: '', numQuestions: 5 });
  const [aiStatus, setAiStatus] = useState(null);

  // Faculty: quizzes available to attach to a module
  const [courseQuizzes, setCourseQuizzes] = useState([]);
  const [selectedQuizByModule, setSelectedQuizByModule] = useState({}); // moduleId -> quizId
  const [attachStatus, setAttachStatus] = useState(null);

  // Faculty: add-lesson form, per module
  const [lessonFormOpenFor, setLessonFormOpenFor] = useState(null); // moduleId or null
  const [lessonForm, setLessonForm] = useState({ title: '', contentType: 'text', contentUrl: '' });

  // Everyone: which lesson's content is currently expanded/visible
  const [expandedLessonId, setExpandedLessonId] = useState(null);

  const loadCourseQuizzes = () => {
    api
      .get(`/quizzes/course/${id}`)
      .then((res) => setCourseQuizzes(res.data))
      .catch(() => setCourseQuizzes([]));
  };

  const load = () => {
    api.get(`/courses/${id}`).then((res) => setCourse(res.data)).catch((err) => setError(err.response?.data?.message || 'Failed to load course'));
    if (user?.role === 'student') {
      api
        .get(`/courses/${id}/enrollment`)
        .then((res) => setEnrollment(res.data))
        .catch(() => setEnrollment(null));
    }
  };

  useEffect(load, [id, user]);

  useEffect(() => {
    if (user?.role === 'faculty' || user?.role === 'admin') {
      loadCourseQuizzes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const handleCompleteLesson = async (lessonId) => {
    try {
      const { data } = await api.post(`/courses/${id}/lessons/${lessonId}/complete`);
      setEnrollment(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark complete');
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/courses/${id}/modules`, { title: moduleTitle, lessons: [] });
      setModuleTitle('');
      setShowModuleForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add module');
    }
  };

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    setAiStatus({ type: 'loading', message: 'Generating quiz…' });
    try {
      const { data } = await api.post('/quizzes/generate', {
        courseId: id,
        title: aiForm.title,
        topicOrText: aiForm.topicOrText,
        numQuestions: Number(aiForm.numQuestions),
        difficulty: 'medium',
      });
      setAiStatus({ type: 'success', message: `Generated "${data.title}" with ${data.questions.length} questions.` });
      setAiForm({ title: '', topicOrText: '', numQuestions: 5 });
      loadCourseQuizzes();
    } catch (err) {
      setAiStatus({ type: 'error', message: err.response?.data?.message || 'AI generation failed' });
    }
  };

  const handleAttachQuiz = async (moduleId) => {
    const quizId = selectedQuizByModule[moduleId];
    if (!quizId) return;
    setAttachStatus(null);
    try {
      const { data } = await api.put(`/courses/${id}/modules/${moduleId}/quiz`, { quizId });
      setCourse(data);
      setAttachStatus({ type: 'success', message: 'Quiz attached to module.' });
    } catch (err) {
      setAttachStatus({ type: 'error', message: err.response?.data?.message || 'Failed to attach quiz' });
    }
  };

  const handleTogglePublish = async () => {
    try {
      const { data } = await api.put(`/courses/${id}`, { published: !course.published });
      setCourse(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update publish status');
    }
  };

  const handleAddLesson = async (e, moduleId) => {
    e.preventDefault();
    try {
      const { data } = await api.post(`/courses/${id}/modules/${moduleId}/lessons`, lessonForm);
      setCourse(data);
      setLessonForm({ title: '', contentType: 'text', contentUrl: '' });
      setLessonFormOpenFor(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add lesson');
    }
  };

  if (error) return <div className="max-w-4xl mx-auto px-6 py-10 text-coral-400">{error}</div>;
  if (!course) return <div className="max-w-4xl mx-auto px-6 py-10 text-mist-500">Loading…</div>;

  const isOwnerFaculty = user?.role === 'faculty' && course.faculty?._id === user.id;
  const completedIds = new Set((enrollment?.completedLessons || []).map(String));

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-teal-400 mb-1">{course.category || 'General'}</p>
          <h1 className="font-display text-2xl font-bold">{course.title}</h1>
          <p className="text-mist-500 mt-2">{course.description}</p>
          <p className="text-xs text-mist-500 mt-2">Instructor: {course.faculty?.name}</p>
        </div>
        {isOwnerFaculty && (
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full ${course.published ? 'bg-teal-500/20 text-teal-400' : 'bg-mist-500/20 text-mist-300'}`}>
              {course.published ? 'Published' : 'Draft'}
            </span>
            <button className="btn-secondary text-sm" onClick={handleTogglePublish}>
              {course.published ? 'Unpublish' : 'Publish course'}
            </button>
          </div>
        )}
      </div>

      {isOwnerFaculty && (
        <div className="card p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-semibold">Modules</h2>
              <button className="btn-secondary text-sm" onClick={() => setShowModuleForm((s) => !s)}>
                {showModuleForm ? 'Cancel' : '+ Add module'}
              </button>
            </div>
            {showModuleForm && (
              <form onSubmit={handleAddModule} className="flex gap-2">
                <input className="input" placeholder="Module title" required value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} />
                <button className="btn-primary" type="submit">Add</button>
              </form>
            )}
          </div>

          <div className="border-t border-ink-700 pt-4">
            <h2 className="font-display font-semibold mb-2">AI Quiz Generator</h2>
            <p className="text-xs text-mist-500 mb-3">
              Paste a few paragraphs of course notes — questions are generated from the actual text.
            </p>
            <form onSubmit={handleGenerateQuiz} className="space-y-3">
              <input
                className="input"
                placeholder="Quiz title (optional)"
                value={aiForm.title}
                onChange={(e) => setAiForm({ ...aiForm, title: e.target.value })}
              />
              <textarea
                className="input"
                placeholder="Paste course notes / textbook paragraph here…"
                rows={5}
                required
                value={aiForm.topicOrText}
                onChange={(e) => setAiForm({ ...aiForm, topicOrText: e.target.value })}
              />
              <div className="flex items-center gap-3">
                <input
                  className="input w-24"
                  type="number"
                  min={1}
                  max={20}
                  value={aiForm.numQuestions}
                  onChange={(e) => setAiForm({ ...aiForm, numQuestions: e.target.value })}
                />
                <button className="btn-primary" type="submit">Generate quiz</button>
              </div>
            </form>
            {aiStatus && (
              <p className={`text-sm mt-2 ${aiStatus.type === 'error' ? 'text-coral-400' : aiStatus.type === 'success' ? 'text-teal-400' : 'text-mist-500'}`}>
                {aiStatus.message}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {attachStatus && (
          <p className={`text-sm ${attachStatus.type === 'error' ? 'text-coral-400' : 'text-teal-400'}`}>
            {attachStatus.message}
          </p>
        )}
        {course.modules.map((mod) => (
          <div key={mod._id} className="card p-5">
            <h3 className="font-display font-semibold mb-3">{mod.title}</h3>
            <ul className="space-y-1 mb-3">
              {mod.lessons.map((lesson) => {
                const done = completedIds.has(lesson._id);
                const expanded = expandedLessonId === lesson._id;
                return (
                  <li key={lesson._id} className="py-1">
                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => setExpandedLessonId(expanded ? null : lesson._id)}
                        className={`text-left hover:underline ${done ? 'text-mist-500 line-through' : 'text-mist-100'}`}
                      >
                        {lesson.title}
                      </button>
                      <div className="flex items-center gap-3">
                        {user?.role === 'student' && !done && (
                          <button onClick={() => handleCompleteLesson(lesson._id)} className="text-gold-400 hover:underline text-xs">
                            Mark complete
                          </button>
                        )}
                        {done && <span className="text-teal-400 text-xs">✓ done</span>}
                      </div>
                    </div>
                    {expanded && (
                      <div className="mt-2 mb-1 p-3 bg-ink-900 rounded-lg border border-ink-700 text-sm text-mist-300">
                        {lesson.contentType === 'text' && (
                          <p>{lesson.contentUrl || 'No content added for this lesson yet.'}</p>
                        )}
                        {lesson.contentType === 'video' && lesson.contentUrl && (
                          <a href={lesson.contentUrl} target="_blank" rel="noreferrer" className="text-gold-400 hover:underline break-all">
                            ▶ Watch video: {lesson.contentUrl}
                          </a>
                        )}
                        {lesson.contentType === 'pdf' && lesson.contentUrl && (
                          <a href={lesson.contentUrl} target="_blank" rel="noreferrer" className="text-gold-400 hover:underline break-all">
                            📄 Open PDF: {lesson.contentUrl}
                          </a>
                        )}
                        {lesson.contentType !== 'text' && !lesson.contentUrl && (
                          <p className="text-mist-500">No link added for this lesson yet.</p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {isOwnerFaculty && (
              <div className="mb-3">
                {lessonFormOpenFor === mod._id ? (
                  <form onSubmit={(e) => handleAddLesson(e, mod._id)} className="space-y-2 bg-ink-900 p-3 rounded-lg border border-ink-700">
                    <input
                      className="input text-sm py-1.5"
                      placeholder="Lesson title"
                      required
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <select
                        className="input text-sm py-1.5 !w-32 shrink-0"
                        value={lessonForm.contentType}
                        onChange={(e) => setLessonForm({ ...lessonForm, contentType: e.target.value })}
                      >
                        <option value="text">Text</option>
                        <option value="video">Video link</option>
                        <option value="pdf">PDF link</option>
                      </select>
                      <input
                        className="input text-sm py-1.5 flex-1 !w-auto min-w-0"
                        placeholder={lessonForm.contentType === 'text' ? 'Lesson content' : 'URL'}
                        value={lessonForm.contentUrl}
                        onChange={(e) => setLessonForm({ ...lessonForm, contentUrl: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-primary text-sm" type="submit">Save lesson</button>
                      <button
                        type="button"
                        className="btn-secondary text-sm"
                        onClick={() => setLessonFormOpenFor(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="text-gold-400 hover:underline text-xs"
                    onClick={() => {
                      setLessonFormOpenFor(mod._id);
                      setLessonForm({ title: '', contentType: 'text', contentUrl: '' });
                    }}
                  >
                    + Add lesson
                  </button>
                )}
              </div>
            )}
            {mod.quiz && (
              <Link to={`/quizzes/${mod.quiz}`} className="btn-primary text-sm inline-block mr-2">
                Take module quiz
              </Link>
            )}
            {isOwnerFaculty && (
              <div className="flex items-center gap-2 mt-2">
                <select
                  className="input text-sm py-1.5"
                  value={selectedQuizByModule[mod._id] || ''}
                  onChange={(e) =>
                    setSelectedQuizByModule({ ...selectedQuizByModule, [mod._id]: e.target.value })
                  }
                >
                  <option value="">{mod.quiz ? 'Change quiz…' : 'Attach a quiz…'}</option>
                  {courseQuizzes.map((q) => (
                    <option key={q._id} value={q._id}>
                      {q.title} ({q.source}, {q.questionCount}q)
                    </option>
                  ))}
                </select>
                <button
                  className="btn-secondary text-sm"
                  disabled={!selectedQuizByModule[mod._id]}
                  onClick={() => handleAttachQuiz(mod._id)}
                >
                  {mod.quiz ? 'Replace' : 'Attach'}
                </button>
              </div>
            )}
            {isOwnerFaculty && courseQuizzes.length === 0 && !mod.quiz && (
              <p className="text-xs text-mist-500 mt-2">
                No quizzes yet — generate one above with the AI Quiz Generator first.
              </p>
            )}
          </div>
        ))}
        {course.modules.length === 0 && <p className="text-mist-500 text-sm">No modules added yet.</p>}
      </div>
    </div>
  );
}