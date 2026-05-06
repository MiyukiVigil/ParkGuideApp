/**
 * Enhanced AR Training Scenarios with Biodiversity Information
 * Includes multiple environment types and comprehensive hotspot data
 */

// High-quality nature images from reliable public sources
// These can be replaced with your own images or CDN URLs
export const ENVIRONMENT_IMAGES = {
  // Tropical Rainforest
  tropical_rainforest: {
    panorama: "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=1200&h=800&fit=crop", // Tropical forest
    thumbnail: "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=400&h=300&fit=crop",
    environment: "Tropical Rainforest",
  },
  // Temperate Forest
  temperate_forest: {
    panorama: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=800&fit=crop", // Forest canopy
    thumbnail: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop",
    environment: "Temperate Forest",
  },
  // Conservation Area
  conservation_area: {
    panorama: "https://images.unsplash.com/photo-1469022563149-aa64dbd37dae?w=1200&h=800&fit=crop", // Wildlife sanctuary
    thumbnail: "https://images.unsplash.com/photo-1469022563149-aa64dbd37dae?w=400&h=300&fit=crop",
    environment: "Conservation Area",
  },
  // Jungle Canopy
  jungle_canopy: {
    panorama: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&h=800&fit=crop", // Jungle environment
    thumbnail: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=400&h=300&fit=crop",
    environment: "Jungle Canopy",
  },
  // Wetland/Marsh
  wetland: {
    panorama: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop", // Wetland
    thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    environment: "Wetland Ecosystem",
  },
};

export const BIODIVERSITY_HOTSPOTS = {
  // Canopy layer species
  canopy_layer: [
    {
      species: "Emergent Trees",
      scientific: "Various tall species",
      height: "Above 40m",
      characteristics: {
        en: "These are the tallest trees that emerge above the canopy layer",
        ms: "Ini adalah pokok tertinggi yang muncul di atas lapisan kanopi",
        zh: "这些是从树冠层突出的最高的树木",
      },
      wildlife: ["Eagles", "Hornbills", "Flying squirrels"],
      ecology: {
        en: "Provide nesting sites and food sources for canopy birds",
        ms: "Menyediakan tapak bersarang dan sumber makanan untuk burung kanopi",
        zh: "为林冠鸟类提供筑巢地点和食物来源",
      },
    },
    {
      species: "Canopy Trees",
      scientific: "Primary canopy species",
      height: "20-40m",
      characteristics: {
        en: "Form the main dense layer, receiving most sunlight",
        ms: "Membentuk lapisan utama yang padat, menerima cahaya matahari yang paling banyak",
        zh: "形成主要密集层，接收大部分阳光",
      },
      wildlife: ["Monkeys", "Parrots", "Tree frogs"],
      ecology: {
        en: "Create the primary food source layer with fruits and seeds",
        ms: "Buat lapisan sumber makanan utama dengan buah-buahan dan biji",
        zh: "用水果和种子创造主要食物来源层",
      },
    },
  ],
  // Understory layer
  understory: [
    {
      species: "Young Trees & Shrubs",
      scientific: "Seedlings and juvenile plants",
      height: "2-15m",
      characteristics: {
        en: "Shade-tolerant plants waiting to grow larger",
        ms: "Tumbuhan yang tahan bayang menunggu untuk berkembang lebih besar",
        zh: "耐阴植物等待生长更大",
      },
      wildlife: ["Insects", "Small mammals", "Low-flying birds"],
      ecology: {
        en: "Store potential future canopy trees, prevent soil erosion",
        ms: "Menyimpan pokok kanopi masa depan yang berpotensi, mencegah hakisan tanah",
        zh: "储存潜在的未来林冠树木，防止土壤侵蚀",
      },
    },
    {
      species: "Herbaceous Plants",
      scientific: "Non-woody plants",
      height: "0-2m",
      characteristics: {
        en: "Low-growing plants adapted to low-light conditions",
        ms: "Tumbuhan tumbuh rendah yang beradaptasi dengan keadaan cahaya rendah",
        zh: "适应低光条件的低矮植物",
      },
      wildlife: ["Ground insects", "Herbivores", "Decomposers"],
      ecology: {
        en: "Food source for herbivores, prevent soil disturbance",
        ms: "Sumber makanan untuk herbivor, mencegah gangguan tanah",
        zh: "食草动物的食物来源，防止土壤扰动",
      },
    },
  ],
  // Forest floor
  forest_floor: [
    {
      species: "Leaf Litter",
      scientific: "Decomposing organic matter",
      height: "0-30cm below surface",
      characteristics: {
        en: "Layer of fallen leaves, branches, and dead plants",
        ms: "Lapisan daun jatuh, cabang, dan tumbuhan mati",
        zh: "落叶、树枝和死植物层",
      },
      wildlife: ["Fungi", "Bacteria", "Decomposer insects"],
      ecology: {
        en: "Critical for nutrient recycling, carbon storage, and soil formation",
        ms: "Kritikal untuk kitar semula nutrien, penyimpanan karbon, dan pembentukan tanah",
        zh: "对养分循环、碳储存和土壤形成至关重要",
      },
    },
    {
      species: "Fallen Logs",
      scientific: "Dead wood habitat",
      height: "Ground level",
      characteristics: {
        en: "Rotting wood providing habitat and nutrients",
        ms: "Kayu busuk yang menyediakan habitat dan nutrien",
        zh: "提供栖息地和营养的腐烂木材",
      },
      wildlife: ["Beetles", "Fungi", "Small mammals", "Salamanders"],
      ecology: {
        en: "Host to biodiversity, nutrient recycling hub, water retention",
        ms: "Rumah kepada biodiversiti, pusat kitar semula nutrien, retensi air",
        zh: "生物多样性的栖息地，养分循环中心，水分保持",
      },
    },
  ],
  // Wildlife encounter
  wildlife_safety: [
    {
      species: "Elephant",
      behavior: "Can be unpredictable if mothers protect calves",
      safeDistance: "100+ meters",
      actionPlan: {
        en: "Stop group immediately, move away slowly, do not run, communicate calmly",
        ms: "Hentikan kumpulan dengan serta-merta, gerak menjauhi perlahan, jangan lari, berkomunikasi dengan tenang",
        zh: "立即停止团队，缓慢离开，不要奔跑，冷静沟通",
      },
      guidelines: {
        en: "Never approach, block exit routes, or make loud noises",
        ms: "Jangan pernah mendekat, sekat laluan keluar, atau buat bunyi keras",
        zh: "永远不要靠近、阻挡出路或发出大噪音",
      },
    },
    {
      species: "Big Cats (Tigers, Leopards)",
      behavior: "Naturally shy, avoid humans if possible",
      safeDistance: "200+ meters",
      actionPlan: {
        en: "Back away slowly, do not approach cubs, stay in groups",
        ms: "Undur perlahan, jangan mendekat anak-anak harimau, tinggal dalam kumpulan",
        zh: "缓慢后退，不要靠近幼崽，待在集体中",
      },
      guidelines: {
        en: "Report sightings to rangers, do not film without protection",
        ms: "Laporkan penglihatan kepada penjaga, jangan filem tanpa perlindungan",
        zh: "向护林员报告发现，未经保护不要拍摄",
      },
    },
    {
      species: "Primates (Monkeys, Apes)",
      behavior: "Can be territorial and may grab objects",
      safeDistance: "20+ meters",
      actionPlan: {
        en: "Do not make eye contact, keep backpacks secured, do not feed",
        ms: "Jangan membuat hubungan mata, pastikan beg terjamin, jangan memberi makan",
        zh: "不要接触眼神，确保背包安全，不要喂食",
      },
      guidelines: {
        en: "Avoid sudden movements, loud noises, photography may stress animals",
        ms: "Elakkan gerakan mengejut, bunyi keras, fotografi mungkin menekankan haiwan",
        zh: "避免突然动作、大声噪音、摄影可能会对动物造成压力",
      },
    },
  ],
  // Eco-tourism practices
  ecotourism_practices: [
    {
      practice: "Trail Etiquette",
      description: {
        en: "Stay on designated trails to protect vegetation and prevent erosion",
        ms: "Tinggal di laluan yang ditetapkan untuk melindungi vegetasi dan mencegah hakisan",
        zh: "留在指定步道上以保护植被并防止侵蚀",
      },
      implementation: {
        en: "Point out trail markers, explain why off-trail damage accumulates",
        ms: "Tunjukkan penanda laluan, terangkan mengapa kerosakan luar laluan terkumpul",
        zh: "指出步道标记，解释为什么林外伤害会累积",
      },
      impact: "Protects 1 hectare of forest per trail per year",
    },
    {
      practice: "Leave No Trace",
      description: {
        en: "Remove all waste and avoid collecting natural objects",
        ms: "Buang semua sisa dan elakkan mengumpul objek semula jadi",
        zh: "清除所有垃圾并避免收集天然物体",
      },
      implementation: {
        en: "Provide waste bags, check for collected items at endpoints",
        ms: "Sediakan beg sisa, semak item yang dikumpul di titik akhir",
        zh: "提供垃圾袋，在终点检查收集的物品",
      },
      impact: "Maintains ecosystem for all visitors",
    },
    {
      practice: "Wildlife Respect",
      description: {
        en: "Observe without disturbing or feeding animals",
        ms: "Perhatikan tanpa mengganggu atau memberi makan haiwan",
        zh: "观察而不打扰或喂食动物",
      },
      implementation: {
        en: "Use spotting techniques, teach behavior interpretation",
        ms: "Gunakan teknik pengintaian, ajar tafsiran tingkah laku",
        zh: "使用发现技术，教行为解释",
      },
      impact: "Reduces wildlife stress and changes in natural behavior",
    },
  ],
};

export const SCENARIO_TEMPLATES = {
  forest: {
    label: "Biodiversity",
    icon: "leaf",
    environments: ["tropical_rainforest", "temperate_forest", "jungle_canopy"],
    briefing: {
      en: "Scan the forest environment and practise explaining biodiversity concepts to visitors. Learn about different forest layers and their importance.",
      ms: "Imbas persekitaran hutan dan latih penerangan konsep biodiversiti kepada pelawat. Pelajari tentang lapisan hutan yang berbeza dan kepentingannya.",
      zh: "扫描森林环境并练习向游客讲解生物多样性概念。了解不同的森林层及其重要性。",
    },
    objectives: [
      {
        en: "Identify and explain the four main forest layers",
        ms: "Kenal pasti dan terangkan empat lapisan hutan utama",
        zh: "识别并解释四个主要森林层",
      },
      {
        en: "Understand species adaptation to each layer",
        ms: "Fahami adaptasi spesies terhadap setiap lapisan",
        zh: "了解物种对每一层的适应",
      },
      {
        en: "Explain interconnected ecological roles",
        ms: "Terangkan peranan ekologi yang saling berkaitan",
        zh: "解释相互联系的生态角色",
      },
    ],
    duration: "15-20 minutes",
  },
  eco: {
    label: "Eco-tourism",
    icon: "walk",
    environments: ["conservation_area", "wetland"],
    briefing: {
      en: "Use AR to rehearse low-impact visitor management, trail practices, and conservation principles.",
      ms: "Gunakan AR untuk melatih pengurusan pelawat rendah impak, amalan laluan, dan prinsip pemuliharaan.",
      zh: "使用AR练习低影响游客管理、步道实践和保护原则。",
    },
    objectives: [
      {
        en: "Master trail safety and minimizing environmental impact",
        ms: "Kuasai keselamatan laluan dan meminimalkan kesan alam sekitar",
        zh: "掌握步道安全和最小化环境影响",
      },
      {
        en: "Practice visitor engagement techniques",
        ms: "Latih teknik penglibatan pelawat",
        zh: "练习游客参与技巧",
      },
      {
        en: "Learn to enforce conservation rules effectively",
        ms: "Pelajari cara menguatkuasakan peraturan pemuliharaan dengan berkesan",
        zh: "学会有效执行保护规则",
      },
    ],
    duration: "20-25 minutes",
  },
  wildlife: {
    label: "Wildlife Safety",
    icon: "paw",
    environments: ["tropical_rainforest", "conservation_area"],
    briefing: {
      en: "Practise calm safety decisions during wildlife encounters. Learn species behavior and appropriate responses.",
      ms: "Latih keputusan keselamatan yang tenang semasa pertemuan hidupan liar. Pelajari tingkah laku spesies dan respons yang sesuai.",
      zh: "在野生动物遭遇中练习冷静的安全决策。了解物种行为和适当的反应。",
    },
    objectives: [
      {
        en: "Identify dangerous situations and safe distances",
        ms: "Kenal pasti situasi berbahaya dan jarak selamat",
        zh: "识别危险情况和安全距离",
      },
      {
        en: "Execute proper wildlife encounter protocols",
        ms: "Laksanakan protokol pertemuan hidupan liar yang betul",
        zh: "执行正确的野生动物遭遇协议",
      },
      {
        en: "Protect both visitors and wildlife",
        ms: "Lindungi pelawat dan hidupan liar",
        zh: "保护游客和野生动物",
      },
    ],
    duration: "15-20 minutes",
  },
};

export const ASSESSMENT_QUIZ = {
  forest: [
    {
      id: "q1",
      question: {
        en: "What are the four main layers of a tropical forest?",
        ms: "Apakah empat lapisan utama hutan tropika?",
        zh: "热带森林的四个主要层是什么？",
      },
      options: {
        en: [
          "Canopy, Understory, Shrub, Litter",
          "Emergent, Canopy, Understory, Forest Floor",
          "Upper, Middle, Lower, Ground",
          "Trees, Plants, Grass, Soil",
        ],
        ms: [
          "Kanopi, Lapisan Bawah, Semak, Sampah",
          "Muncul, Kanopi, Lapisan Bawah, Lantai Hutan",
          "Atas, Tengah, Bawah, Tanah",
          "Pokok, Tumbuhan, Rumput, Tanah",
        ],
        zh: [
          "冠层、林下层、灌木层、垃圾",
          "突出层、冠层、林下层、森林地面",
          "上层、中层、下层、地面",
          "树木、植物、草、土壤",
        ],
      },
      correct: 1,
      explanation: {
        en: "The canopy, understory, and forest floor layers, with emergent trees above the main canopy.",
        ms: "Lapisan kanopi, lapisan bawah, dan lantai hutan, dengan pokok muncul di atas kanopi utama.",
        zh: "冠层、林下层和森林地面，主要冠层上方有突出的树木。",
      },
    },
  ],
  eco: [
    {
      id: "q1",
      question: {
        en: "What is the primary reason for staying on designated trails?",
        ms: "Apakah sebab utama untuk tinggal di laluan yang ditetapkan?",
        zh: "留在指定步道上的主要原因是什么？",
      },
      options: {
        en: [
          "It is easier to walk",
          "To protect vegetation and prevent soil erosion",
          "Because guides say so",
          "To move faster",
        ],
        ms: [
          "Lebih mudah berjalan",
          "Untuk melindungi vegetasi dan mencegah hakisan tanah",
          "Kerana pemandu berkata demikian",
          "Untuk bergerak lebih cepat",
        ],
        zh: [
          "更容易行走",
          "保护植被并防止土壤侵蚀",
          "因为导游这么说",
          "为了更快地移动",
        ],
      },
      correct: 1,
      explanation: {
        en: "Off-trail walking damages vegetation and causes cumulative soil erosion affecting the ecosystem.",
        ms: "Berjalan di luar laluan merosakan vegetasi dan menyebabkan hakisan tanah kumulatif yang mempengaruhi ekosistem.",
        zh: "离开步道行走会损害植被并导致累积的土壤侵蚀，影响生态系统。",
      },
    },
  ],
  wildlife: [
    {
      id: "q1",
      question: {
        en: "What should you do if you encounter a large wild animal on the trail?",
        ms: "Apa yang patut anda lakukan jika anda berjumpa haiwan liar yang besar di laluan?",
        zh: "如果您在步道上遇到一只大型野生动物，您应该怎么办？",
      },
      options: {
        en: [
          "Run away quickly",
          "Take a photo from a close distance",
          "Stop immediately, move away slowly, and stay calm",
          "Feed it to make it friendly",
        ],
        ms: [
          "Lari pergi dengan cepat",
          "Ambil foto dari jarak dekat",
          "Henti dengan serta-merta, gerak menjauhi perlahan, dan kekal tenang",
          "Beri makan untuk menjadikannya mesra",
        ],
        zh: [
          "快速逃跑",
          "从近距离拍照",
          "立即停止，缓慢离开，保持冷静",
          "喂食使其变得友好",
        ],
      },
      correct: 2,
      explanation: {
        en: "Sudden movements or sounds can trigger defensive behavior. Calm, slow retreat maintains safety.",
        ms: "Pergerakan atau bunyi mendadak boleh mencetuskan perilaku defensif. Mundur perlahan dan tenang mengekalkan keselamatan.",
        zh: "突然的运动或声音可能会引发防御行为。冷静、缓慢的撤退保持安全。",
      },
    },
  ],
};

export default {
  ENVIRONMENT_IMAGES,
  BIODIVERSITY_HOTSPOTS,
  SCENARIO_TEMPLATES,
  ASSESSMENT_QUIZ,
};
