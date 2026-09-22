import { InstitutionCategory } from '../types';

export interface FacultyItem {
  id: string;
  name: string;
  shortName?: string;
  icon: string;
  description: string;
  departments: string[];
}

export interface InstitutionCategoryStructure {
  category: InstitutionCategory;
  label: string;
  facultyLabel: string; // "Faculty" for Uni, "School" for Poly / COE
  faculties: FacultyItem[];
}

export const ACADEMIC_STRUCTURE_BY_CATEGORY: Record<InstitutionCategory, InstitutionCategoryStructure> = {
  University: {
    category: 'University',
    label: 'University Degree Programs',
    facultyLabel: 'Faculty',
    faculties: [
      {
        id: 'uni_computing',
        name: 'Faculty of Computing & Information Technology',
        shortName: 'Computing & IT',
        icon: '💻',
        description: 'Computer Science, Software Engineering, AI, and Cybersecurity programs',
        departments: [
          'Computer Science',
          'Software Engineering',
          'Cyber Security',
          'Artificial Intelligence & Machine Learning',
          'Data Science & Analytics',
          'Information Technology',
          'Information Systems',
          'Computer with Economics',
          'Computer with Statistics',
          'Computer & Mathematics',
        ],
      },
      {
        id: 'uni_engineering',
        name: 'Faculty of Engineering & Technology',
        shortName: 'Engineering',
        icon: '⚙️',
        description: 'Electrical, Mechanical, Civil, Chemical, Computer, and Mechatronics Engineering',
        departments: [
          'Electrical & Electronics Engineering',
          'Mechanical Engineering',
          'Civil & Environmental Engineering',
          'Chemical Engineering',
          'Petroleum & Gas Engineering',
          'Computer Engineering',
          'Mechatronics & Robotics Engineering',
          'Agricultural & Biosystems Engineering',
          'Materials & Metallurgical Engineering',
          'Biomedical Engineering',
          'Aerospace & Aeronautical Engineering',
          'Systems Engineering',
          'Industrial & Production Engineering',
          'Marine Engineering',
          'Mining Engineering',
          'Structural Engineering',
          'Telecommunications Engineering',
          'Water Resources Engineering',
        ],
      },
      {
        id: 'uni_science',
        name: 'Faculty of Science',
        shortName: 'Pure & Applied Sciences',
        icon: '🔬',
        description: 'Biological, Physical, Chemical, and Mathematical sciences',
        departments: [
          'Microbiology',
          'Biochemistry',
          'Industrial Chemistry',
          'Pure & Applied Chemistry',
          'Physics with Electronics',
          'Pure & Applied Physics',
          'Pure & Applied Mathematics',
          'Statistics',
          'Geology & Earth Sciences',
          'Geophysics',
          'Plant Biology & Biotechnology (Botany)',
          'Zoology & Environmental Biology',
          'Cell Biology & Genetics',
          'Marine Biology & Fisheries',
          'Biotechnology',
          'Meteorology & Climate Science',
          'Archaeology',
        ],
      },
      {
        id: 'uni_medicine',
        name: 'Faculty of Clinical Medicine & Surgery',
        shortName: 'Clinical Medicine',
        icon: '🩺',
        description: 'MBBS, Clinical Sciences, Surgery, and Diagnostics',
        departments: [
          'Medicine & Surgery (MBBS)',
          'Internal Medicine',
          'Surgery',
          'Obstetrics & Gynaecology',
          'Paediatrics & Child Health',
          'Community Medicine & Public Health',
          'Radiology & Radiation Medicine',
          'Anaesthesia & Intensive Care',
          'Ophthalmology',
          'Otorhinolaryngology (ENT)',
          'Psychiatry & Mental Health',
          'Pathology & Forensic Medicine',
          'Haematology & Blood Transfusion',
          'Medical Microbiology & Parasitology',
          'Chemical Pathology',
        ],
      },
      {
        id: 'uni_basic_med',
        name: 'Faculty of Basic Medical & Allied Health Sciences',
        shortName: 'Basic Medical Sciences',
        icon: '🧬',
        description: 'Nursing, Medical Lab, Anatomy, Physiology, and Physiotherapy',
        departments: [
          'Nursing Science',
          'Medical Laboratory Science (MLS)',
          'Human Anatomy',
          'Human Physiology',
          'Physiotherapy / Physical Therapy',
          'Radiography & Radiation Science',
          'Public Health Science',
          'Human Nutrition & Dietetics',
          'Medical Biochemistry',
          'Pharmacology & Therapeutics',
          'Optometry',
          'Prosthetics & Orthotics',
          'Health Information Management',
        ],
      },
      {
        id: 'uni_pharmacy',
        name: 'Faculty of Pharmaceutical Sciences',
        shortName: 'Pharmacy',
        icon: '💊',
        description: 'Pharmacy (Pharm.D / B.Pharm) and Pharmaceutical Chemistry',
        departments: [
          'Pharmacy (B.Pharm / Pharm.D)',
          'Pharmaceutical & Medicinal Chemistry',
          'Pharmaceutics & Pharmaceutical Technology',
          'Pharmacognosy & Herbal Medicine',
          'Clinical Pharmacy & Pharmacy Practice',
          'Pharmacology & Toxicology',
          'Pharmaceutical Microbiology & Biotechnology',
        ],
      },
      {
        id: 'uni_dentistry',
        name: 'Faculty of Dental Sciences (Dentistry)',
        shortName: 'Dentistry',
        icon: '🦷',
        description: 'Dental Surgery (BDS), Oral Pathology, and Orthodontics',
        departments: [
          'Dental Surgery (BDS)',
          'Oral & Maxillofacial Surgery',
          'Oral Pathology & Medicine',
          'Preventive & Community Dentistry',
          'Restorative Dentistry',
          'Child Dental Health & Orthodontics',
        ],
      },
      {
        id: 'uni_management',
        name: 'Faculty of Management & Business Administration',
        shortName: 'Management Sciences',
        icon: '📊',
        description: 'Accounting, Banking, Finance, Business Admin, and Marketing',
        departments: [
          'Accounting',
          'Banking & Finance',
          'Business Administration & Management',
          'Marketing & Brand Strategy',
          'Public Administration',
          'Human Resource Management',
          'Insurance & Actuarial Science',
          'Entrepreneurship & Innovation',
          'Industrial Relations & Personnel Management',
          'Procurement & Supply Chain Management',
          'Hospitality & Tourism Management',
          'Cooperative Economics & Management',
        ],
      },
      {
        id: 'uni_social_sciences',
        name: 'Faculty of Social Sciences',
        shortName: 'Social Sciences',
        icon: '🌐',
        description: 'Economics, Political Science, Sociology, Psychology, and Demography',
        departments: [
          'Economics',
          'Political Science',
          'International Relations & Diplomacy',
          'Sociology & Anthropology',
          'Psychology & Behavioural Studies',
          'Mass Communication & Media Studies',
          'Criminology & Security Studies',
          'Geography & Regional Planning',
          'Demography & Social Statistics',
          'Peace & Conflict Resolution Studies',
          'Public Policy & Governance',
          'Social Work',
        ],
      },
      {
        id: 'uni_law',
        name: 'Faculty of Law & Jurisprudence',
        shortName: 'Law',
        icon: '⚖️',
        description: 'Civil Law, Common Law, Islamic/Sharia Law, and International Law',
        departments: [
          'Commercial & Corporate Law',
          'Private & Property Law',
          'Public & International Law',
          'Jurisprudence & Legal Theory',
          'Constitutional & Administrative Law',
          'Islamic & Sharia Law',
          'Customary Law',
          'Criminal Law & Criminology',
          'Environmental & Energy Law',
          'Human Rights Law',
        ],
      },
      {
        id: 'uni_arts',
        name: 'Faculty of Arts & Humanities',
        shortName: 'Arts & Humanities',
        icon: '🎨',
        description: 'Literature, Languages, History, Philosophy, and Creative Arts',
        departments: [
          'English & Literary Studies',
          'History & Strategic Studies',
          'Philosophy',
          'Linguistics & African Languages',
          'Yoruba Language & Literature',
          'Hausa Language & Literature',
          'Igbo Language & Literature',
          'French & International Studies',
          'Arabic & Islamic Studies',
          'Christian Religious Studies (CRS)',
          'Theatre, Film & Performing Arts',
          'Music & Musicology',
          'Fine & Applied Arts / Visual Arts',
          'Creative Arts & Design',
          'German Studies',
          'Russian Studies',
        ],
      },
      {
        id: 'uni_education',
        name: 'Faculty of Education',
        shortName: 'Education',
        icon: '🎓',
        description: 'Teacher Education, Curriculum Studies, Educational Management',
        departments: [
          'Educational Management & Planning',
          'Guidance & Counselling',
          'Curriculum & Instruction',
          'Science Education (Mathematics)',
          'Science Education (Physics)',
          'Science Education (Chemistry)',
          'Science Education (Biology)',
          'Science Education (Computer Science)',
          'Educational Technology',
          'Early Childhood & Primary Education',
          'Adult & Non-Formal Education',
          'Special Education & Needs Support',
          'Human Kinetics & Health Education',
          'Business Education',
          'Vocational & Technical Education',
          'Arts Education (English, History, CRS)',
          'Social Science Education (Economics, Govt)',
        ],
      },
      {
        id: 'uni_agriculture',
        name: 'Faculty of Agricultural Sciences & Forestry',
        shortName: 'Agriculture',
        icon: '🌱',
        description: 'Agronomy, Animal Science, Agricultural Economics, and Fisheries',
        departments: [
          'Agronomy & Crop Science',
          'Animal Science & Livestock Production',
          'Agricultural Economics & Farm Management',
          'Agricultural Extension & Rural Development',
          'Soil Science & Land Management',
          'Fisheries & Aquaculture',
          'Forestry & Wildlife Management',
          'Food Science & Technology',
          'Crop Protection & Pest Management',
          'Horticulture & Landscape Management',
          'Agribusiness Management',
          'Ecotourism & Wildlife Conservation',
        ],
      },
      {
        id: 'uni_environmental',
        name: 'Faculty of Environmental Sciences & Design',
        shortName: 'Environmental Sciences',
        icon: '🏛️',
        description: 'Architecture, Estate Management, Urban Planning, Quantity Surveying',
        departments: [
          'Architecture',
          'Estate Management & Valuation',
          'Urban & Regional Planning',
          'Quantity Surveying',
          'Building Technology & Management',
          'Surveying & Geoinformatics',
          'Landscape Architecture',
          'Interior Design & Environmental Aesthetics',
          'Environmental Management & Toxicology',
        ],
      },
      {
        id: 'uni_vet_med',
        name: 'Faculty of Veterinary Medicine',
        shortName: 'Veterinary Medicine',
        icon: '🐾',
        description: 'DVM, Veterinary Surgery, Pathology, and Public Health',
        departments: [
          'Doctor of Veterinary Medicine (DVM)',
          'Veterinary Anatomy & Physiology',
          'Veterinary Pathology & Microbiology',
          'Veterinary Parasitology & Entomology',
          'Veterinary Pharmacology & Toxicology',
          'Veterinary Public Health & Preventive Medicine',
          'Veterinary Surgery & Theriogenology',
          'Veterinary Medicine (Large & Small Animal)',
        ],
      },
      {
        id: 'uni_communication',
        name: 'Faculty of Communication & Media Studies',
        shortName: 'Communication & Media',
        icon: '🎙️',
        description: 'Journalism, Broadcasting, Public Relations, Advertising, and Film',
        departments: [
          'Mass Communication',
          'Journalism & Media Studies',
          'Broadcasting (Radio & Television)',
          'Public Relations & Advertising (PRAD)',
          'Film, Cinema & Multimedia Production',
          'Development Communication',
          'Information & Media Studies',
          'Strategic & Corporate Communication',
        ],
      },
    ],
  },

  Polytechnic: {
    category: 'Polytechnic',
    label: 'National Diploma (ND) & Higher National Diploma (HND)',
    facultyLabel: 'School',
    faculties: [
      {
        id: 'poly_applied_sci',
        name: 'School of Applied Sciences & Computing',
        shortName: 'Applied Sciences',
        icon: '💻',
        description: 'Computer Science, SLT, Statistics, and Food Tech programs',
        departments: [
          'Computer Science',
          'Science Laboratory Technology (SLT)',
          'Statistics & Mathematics',
          'Food Technology',
          'Hospitality & Tourism Management',
          'Nutrition & Dietetics',
          'Agricultural Technology',
          'Fisheries Technology',
          'Horticultural Technology',
          'Leisure & Tourism Management',
          'Textile Technology',
        ],
      },
      {
        id: 'poly_engineering',
        name: 'School of Engineering Technology',
        shortName: 'Engineering Tech',
        icon: '⚙️',
        description: 'ND & HND Electrical, Mechanical, Civil, and Computer Engineering',
        departments: [
          'Electrical / Electronics Engineering Technology',
          'Mechanical Engineering Technology',
          'Civil Engineering Technology',
          'Computer Engineering Technology',
          'Agricultural & Bio-Environmental Engineering',
          'Chemical Engineering Technology',
          'Mechatronics Engineering Technology',
          'Metallurgical & Materials Engineering',
          'Welding & Fabrication Technology',
          'Automotive Engineering Technology',
          'Industrial Safety & Environmental Technology',
          'Marine Engineering Technology',
          'Mineral & Petroleum Resources Engineering',
          'Foundry Engineering Technology',
        ],
      },
      {
        id: 'poly_business',
        name: 'School of Business & Management Studies',
        shortName: 'Business Studies',
        icon: '📊',
        description: 'Accountancy, Business Admin, Banking, Marketing, and OTM',
        departments: [
          'Accountancy',
          'Business Administration & Management',
          'Banking & Finance',
          'Marketing',
          'Public Administration',
          'Office Technology & Management (OTM)',
          'Procurement & Supply Chain Management',
          'Insurance & Risk Management',
          'Taxation & Fiscal Studies',
          'Cooperative Economics & Management',
          'Local Government Studies',
          'Human Resource Management',
        ],
      },
      {
        id: 'poly_environmental',
        name: 'School of Environmental Studies & Design',
        shortName: 'Environmental Studies',
        icon: '📐',
        description: 'Architecture, Building Tech, Estate Management, and Surveying',
        departments: [
          'Architectural Technology',
          'Building Technology',
          'Estate Management & Valuation',
          'Quantity Surveying',
          'Surveying & Geo-Informatics',
          'Urban & Regional Planning',
          'Art & Industrial Design (Graphic / Textile)',
          'Fashion Design & Clothing Technology',
          'Interior Design Technology',
          'Cartography & Remote Sensing',
        ],
      },
      {
        id: 'poly_comm_info',
        name: 'School of Information, Communication & Media Studies',
        shortName: 'Communication & Media',
        icon: '📰',
        description: 'Mass Comm, Printing Tech, Library Science, and Media Arts',
        departments: [
          'Mass Communication',
          'Printing Technology',
          'Library & Information Science',
          'Film & Video Production Technology',
          'Music Technology',
          'Information & Communication Technology (ICT)',
          'Photography & Digital Imaging',
        ],
      },
      {
        id: 'poly_liberal',
        name: 'School of Liberal Studies & General Studies',
        shortName: 'Liberal Studies',
        icon: '📚',
        description: 'General Studies, Languages, Social Development, and Crime Management',
        departments: [
          'General Studies & Humanities',
          'Crime Management & Security Studies',
          'Social Development & Community Welfare',
          'Languages & Communication Skills',
          'Public Policy & Administrative Ethics',
        ],
      },
    ],
  },

  'College of Education': {
    category: 'College of Education',
    label: 'Nigeria Certificate in Education (NCE) & B.Ed Programs',
    facultyLabel: 'School',
    faculties: [
      {
        id: 'coe_sciences',
        name: 'School of Science Education',
        shortName: 'Science Education',
        icon: '🔬',
        description: 'Computer, Mathematics, Physics, Chemistry, and Biology Education',
        departments: [
          'Computer Science Education',
          'Mathematics Education',
          'Physics Education',
          'Chemistry Education',
          'Biology Education',
          'Integrated Science Education',
          'Physical & Health Education (PHE)',
          'Agricultural Science Education',
          'Geography Education',
        ],
      },
      {
        id: 'coe_vocational',
        name: 'School of Vocational & Technical Education',
        shortName: 'Vocational & Tech Ed',
        icon: '🛠️',
        description: 'Business Ed, Home Economics, Technical Trades, and Fine Arts',
        departments: [
          'Business Education (Accounting Option)',
          'Business Education (Secretarial / Office Option)',
          'Home Economics Education',
          'Agricultural Education',
          'Technical Education (Electrical / Electronics)',
          'Technical Education (Building / Woodwork)',
          'Technical Education (Metalwork / Auto-Mechanics)',
          'Fine & Applied Arts Education',
        ],
      },
      {
        id: 'coe_arts_social',
        name: 'School of Arts & Social Science Education',
        shortName: 'Arts & Social Science Ed',
        icon: '🌍',
        description: 'Social Studies, Economics, Political Science, History, CRS/IRS',
        departments: [
          'Social Studies Education',
          'Economics Education',
          'Political Science Education',
          'History Education',
          'Christian Religious Studies (CRS) Education',
          'Islamic Religious Studies (IRS) Education',
          'Geography & Environmental Education',
          'Music Education',
          'Theatre Arts Education',
        ],
      },
      {
        id: 'coe_languages',
        name: 'School of Languages Education',
        shortName: 'Languages Education',
        icon: '📖',
        description: 'English, French, Yoruba, Hausa, Igbo, and Arabic Education',
        departments: [
          'English Language & Literature Education',
          'French Language Education',
          'Yoruba Language Education',
          'Hausa Language Education',
          'Igbo Language Education',
          'Arabic Language Education',
          'Literature-in-English Education',
        ],
      },
      {
        id: 'coe_foundations',
        name: 'School of Education & Professional Foundations',
        shortName: 'Education Foundations',
        icon: '🎓',
        description: 'Educational Foundations, Psychology, Curriculum, Guidance & Counselling',
        departments: [
          'Educational Foundations & Management',
          'Curriculum Studies & Educational Technology',
          'Guidance & Counselling Education',
          'Educational Psychology & Measurement',
          'General Studies in Education (GSE)',
          'Adult & Non-Formal Education',
        ],
      },
      {
        id: 'coe_early_childhood',
        name: 'School of Early Childhood Care & Primary Education (ECCPE)',
        shortName: 'ECCPE & Special Ed',
        icon: '🧸',
        description: 'Early Childhood, Primary Education Studies (PES), and Special Needs',
        departments: [
          'Primary Education Studies (PES)',
          'Early Childhood Care & Education (ECCE)',
          'Special Needs & Inclusive Education',
        ],
      },
    ],
  },
  'College of Health & Nursing': {
    category: 'College of Health & Nursing',
    label: 'Health Technology & Nursing Colleges',
    facultyLabel: 'School',
    faculties: [
      {
        id: 'health_nursing',
        name: 'School of Nursing & Midwifery Sciences',
        shortName: 'Nursing & Midwifery',
        icon: '🩺',
        description: 'General Nursing (RN), Basic Midwifery (RM), and Public Health Nursing',
        departments: [
          'General Nursing (RN)',
          'Basic Midwifery (RM)',
          'Public Health Nursing (HND)',
          'Perioperative & Critical Care Nursing',
          'Paediatric Nursing',
          'Ophthalmic Nursing',
          'Psychiatric & Mental Health Nursing',
        ],
      },
      {
        id: 'health_tech',
        name: 'School of Community Health & Allied Health Technologies',
        shortName: 'Health Technology',
        icon: '🏥',
        description: 'Community Health Extension (CHEW), Medical Laboratory Tech, and Health Info',
        departments: [
          'Community Health Extension Work (CHEW)',
          'Medical Laboratory Technician (MLT)',
          'Health Information Management (HIM)',
          'Environmental Health Technology (EHT)',
          'Pharmacy Technician Studies',
          'Dental Health & Therapy',
          'Biomedical Engineering Technology',
          'Medical Imaging & X-Ray Technology',
        ],
      },
    ],
  },
  'Specialized Institute': {
    category: 'Specialized Institute',
    label: 'Specialized Professional Institutes',
    facultyLabel: 'School / Academy',
    faculties: [
      {
        id: 'spec_maritime_aviation',
        name: 'School of Maritime, Nautical & Aviation Studies',
        shortName: 'Maritime & Aviation',
        icon: '⚓',
        description: 'Nautical Science, Marine Engineering, Aviation Management, and Piloting',
        departments: [
          'Nautical Science & Navigation',
          'Marine Engineering & Ship Propulsion',
          'Maritime Transport & Port Management',
          'Aviation Management & Flight Operations',
          'Air Traffic Control & Aeronautical Tech',
          'Aircraft Maintenance Engineering',
        ],
      },
      {
        id: 'spec_petroleum_security',
        name: 'School of Petroleum, Energy & Defense Technologies',
        shortName: 'Petroleum & Defense',
        icon: '⚡',
        description: 'Petroleum Training, Renewable Energy, Defense & Forensic Technology',
        departments: [
          'Petroleum Processing & Drilling Tech',
          'Renewable Energy & Power Systems',
          'Security, Intelligence & Forensics',
          'Logistics & Supply Chain Operations',
        ],
      },
    ],
  },
};

/**
 * Helper to get all faculties for a specific institution category
 */
export const getFacultiesByCategory = (category: InstitutionCategory): FacultyItem[] => {
  const struct = ACADEMIC_STRUCTURE_BY_CATEGORY[category] || ACADEMIC_STRUCTURE_BY_CATEGORY.University;
  return struct.faculties;
};

/**
 * Helper to get departments for a specific faculty in a category
 */
export const getDepartmentsByFaculty = (category: InstitutionCategory, facultyName: string): string[] => {
  const faculties = getFacultiesByCategory(category);
  const found = faculties.find(
    (f) =>
      f.name.toLowerCase() === facultyName.toLowerCase() ||
      f.shortName?.toLowerCase() === facultyName.toLowerCase() ||
      f.id === facultyName
  );
  if (found) {
    return found.departments;
  }

  // Fallback search across all faculties if not found
  for (const f of faculties) {
    if (f.name.toLowerCase().includes(facultyName.toLowerCase())) {
      return f.departments;
    }
  }

  return [];
};

/**
 * Helper to get all unique departments in a category
 */
export const getAllDepartmentsByCategory = (category: InstitutionCategory): string[] => {
  const faculties = getFacultiesByCategory(category);
  const deptSet = new Set<string>();
  faculties.forEach((f) => {
    f.departments.forEach((d) => deptSet.add(d));
  });
  return Array.from(deptSet).sort();
};
