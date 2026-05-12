export const AR_COURSE_ID = "local-ar-training-course";
export const AR_CHAPTER_ID = "local-ar-training-chapter";

export const AR_TRAINING_SCENARIOS = [
  {
    id: "offline-biodiversity",
    code: "ar-forest-biodiversity-201",
    title: {
      en: "Tropical Forest Biodiversity Master",
      ms: "Ketua Biodiversiti Hutan Tropika",
      zh: "热带森林生物多样性大师",
    },
    description: {
      en: "Master forest ecosystem layers, species diversity, and ecological niches through an immersive 360 training stop.",
      ms: "Kuasai lapisan ekosistem hutan, kepelbagaian spesies, dan niche ekologi melalui latihan 360 yang imersif.",
      zh: "通过沉浸式 360 训练点掌握森林生态系统层次、物种多样性和生态位。",
    },
    scenario_type: "biodiversity",
    difficulty: "advanced",
    duration_minutes: 35,
    thumbnail: "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?auto=format&fit=crop&w=900&q=80",
    initial_panorama_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/A_panoramic_example_of_the_deep_ravine_forest_ecosystem._%2831018541-539e-49b5-be18-dd6123962a3a%29.JPG/3840px-A_panoramic_example_of_the_deep_ravine_forest_ecosystem._%2831018541-539e-49b5-be18-dd6123962a3a%29.JPG",
    hotspot_count: 5,
    quiz_count: 1,
  },
  {
    id: "offline-ecotourism",
    code: "ar-ecotourism-practices-201",
    title: {
      en: "Sustainable Eco-tourism Excellence",
      ms: "Keunggulan Eko-pelancongan Lestari",
      zh: "可持续生态旅游卓越",
    },
    description: {
      en: "Practise visitor flow control, photo-stop decisions, conservation messaging, and low-impact guiding.",
      ms: "Latih kawalan aliran pelawat, keputusan tempat bergambar, mesej pemuliharaan, dan panduan rendah impak.",
      zh: "练习游客流量控制、拍照点决策、保护信息传达和低影响导览。",
    },
    scenario_type: "ecotourism",
    difficulty: "intermediate",
    duration_minutes: 30,
    thumbnail: "https://images.unsplash.com/photo-1469022563149-aa64dbd37dae?auto=format&fit=crop&w=900&q=80",
    hotspot_count: 3,
    quiz_count: 1,
  },
  {
    id: "offline-wildlife",
    code: "ar-wildlife-safety-advanced",
    title: {
      en: "Wildlife Encounter & Safety Protocol",
      ms: "Protokol Keselamatan & Pertemuan Hidupan Liar",
      zh: "野生动物遭遇和安全协议",
    },
    description: {
      en: "Practise calm crowd control, safe distances, no-feeding messaging, rerouting, and escalation decisions.",
      ms: "Latih kawalan orang ramai, jarak selamat, mesej jangan beri makan, tukar laluan, dan keputusan eskalasi.",
      zh: "练习冷静控场、安全距离、禁止喂食提示、改道和升级处理决策。",
    },
    scenario_type: "wildlife",
    difficulty: "advanced",
    duration_minutes: 40,
    thumbnail: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=900&q=80",
    hotspot_count: 4,
    quiz_count: 1,
  },
  {
    id: "offline-conservation",
    code: "ar-conservation-strategies-201",
    title: {
      en: "Park Conservation & Management",
      ms: "Pemuliharaan & Pengurusan Taman",
      zh: "公园保护和管理",
    },
    description: {
      en: "Connect habitat restoration, invasive species control, environmental monitoring, and visitor interpretation.",
      ms: "Hubungkan pemulihan habitat, kawalan spesies invasif, pemantauan alam sekitar, dan interpretasi pelawat.",
      zh: "连接栖息地恢复、入侵物种控制、环境监测和游客讲解。",
    },
    scenario_type: "conservation",
    difficulty: "intermediate",
    duration_minutes: 28,
    thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80",
    hotspot_count: 3,
    quiz_count: 1,
  },
  {
    id: "offline-guiding",
    code: "ar-guide-ethics-fundamentals",
    title: {
      en: "Professional Park Guide Foundations",
      ms: "Asas Pemandu Taman Profesional",
      zh: "专业公园指南基础",
    },
    description: {
      en: "Build professional judgement, visitor engagement, communication, and ethical guiding responses.",
      ms: "Bina pertimbangan profesional, penglibatan pelawat, komunikasi, dan respons panduan beretika.",
      zh: "建立专业判断、游客互动、沟通能力和合乎伦理的导览回应。",
    },
    scenario_type: "guiding",
    difficulty: "beginner",
    duration_minutes: 20,
    thumbnail: "https://images.unsplash.com/photo-1504681869696-d977e3a01bae?auto=format&fit=crop&w=900&q=80",
    hotspot_count: 2,
    quiz_count: 1,
  },
];

export const getArLessonId = (scenarioId) => `${AR_COURSE_ID}-lesson-${scenarioId}`;

export const buildArTrainingCourse = (completedLessonIds = []) => {
  const lessons = AR_TRAINING_SCENARIOS.map((scenario, index) => ({
    id: getArLessonId(scenario.id),
    chapter: AR_CHAPTER_ID,
    title: scenario.title,
    content_text: scenario.description,
    content_images: [scenario.thumbnail],
    content_videos: [],
    ar_scenario: scenario.id,
    ar_scenario_info: scenario,
    order: index + 1,
    estimated_time: scenario.duration_minutes,
    progress: {
      completed: completedLessonIds.includes(getArLessonId(scenario.id)),
    },
  }));

  const completedLessons = lessons.filter((lesson) => lesson.progress.completed).length;
  const progressPercentage = lessons.length ? (completedLessons / lessons.length) * 100 : 0;

  return {
    id: AR_COURSE_ID,
    code: "ar-training-integrated",
    title: {
      en: "Immersive AR Park Guide Training",
      ms: "Latihan AR Imersif Pemandu Taman",
      zh: "沉浸式 AR 公园导游培训",
    },
    description: {
      en: "Interactive AR scenarios for biodiversity interpretation, eco-tourism control, wildlife safety, conservation, and professional guiding.",
      ms: "Senario AR interaktif untuk interpretasi biodiversiti, kawalan eko-pelancongan, keselamatan hidupan liar, pemuliharaan, dan panduan profesional.",
      zh: "用于生物多样性讲解、生态旅游管控、野生动物安全、保护和专业导览的互动 AR 场景。",
    },
    thumbnail: AR_TRAINING_SCENARIOS[0].thumbnail,
    course_type: "general",
    tags: ["AR", "immersive", "simulation"],
    is_published: true,
    enrollment_status: {
      id: `${AR_COURSE_ID}-enrollment`,
      course: AR_COURSE_ID,
      status: progressPercentage >= 100 ? "completed" : "in_progress",
      progress_percentage: progressPercentage,
    },
    prerequisites_info: [],
    chapters: [
      {
        id: AR_CHAPTER_ID,
        course: AR_COURSE_ID,
        title: {
          en: "AR Field Simulations",
          ms: "Simulasi Lapangan AR",
          zh: "AR 实地模拟",
        },
        description: {
          en: "Launch each AR lesson from inside the course and complete the scenario activities.",
          ms: "Lancarkan setiap pelajaran AR dari dalam kursus dan selesaikan aktiviti senario.",
          zh: "从课程中启动每个 AR 课程并完成场景活动。",
        },
        order: 1,
        lessons,
        practice_exercises: [],
        quizzes: [],
        progress: {
          completed_lessons: completedLessons,
          total_lessons: lessons.length,
          progress_percentage: progressPercentage,
          is_complete: progressPercentage >= 100,
        },
      },
    ],
  };
};

export const isLocalArCourseId = (id) => String(id) === AR_COURSE_ID;
export const isLocalArChapterId = (id) => String(id) === AR_CHAPTER_ID;
export const isLocalArLessonId = (id) => String(id).startsWith(`${AR_COURSE_ID}-lesson-`);
