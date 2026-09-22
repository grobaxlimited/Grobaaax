import { NIGERIAN_INSTITUTIONS, StaticInstitution } from './nigerianInstitutions';
import { ACADEMIC_STRUCTURE_BY_CATEGORY, FacultyItem } from './academicStructureData';
import { ACADEMIC_CURRICULUM_DATA, CourseItem } from './libraryAcademicData';

export type HandoutInstitutionCategory = 'University' | 'Polytechnic' | 'College of Education';

export const HANDOUT_INSTITUTION_CATEGORIES: {
  id: HandoutInstitutionCategory;
  name: string;
  shortLabel: string;
  badge: string;
  iconName: string;
  description: string;
  facultyLabel: string; // "Faculty" for Uni, "School" for Poly / COE
  levels: string[];
}[] = [
  {
    id: 'University',
    name: 'University Degree System',
    shortLabel: 'University',
    badge: 'B.Sc / B.Eng / MBBS / B.A',
    iconName: 'GraduationCap',
    description: 'Federal, State, and Private degree-granting universities across Nigeria.',
    facultyLabel: 'Faculty',
    levels: [
      '100 Level (Freshman)',
      '200 Level (Sophomore)',
      '300 Level (Junior)',
      '400 Level (Senior)',
      '500 Level (Finalist / Eng / Med)',
      '600 Level (Clinical Medicine / Vet / Pharm)',
      'Postgraduate (PGD / M.Sc / PhD)',
    ],
  },
  {
    id: 'Polytechnic',
    name: 'Polytechnic Applied Technology',
    shortLabel: 'Polytechnic',
    badge: 'ND & HND Technology',
    iconName: 'Cpu',
    description: 'Accredited federal, state, and private polytechnics and monotechnics in Nigeria.',
    facultyLabel: 'School',
    levels: [
      'ND I (National Diploma Year 1)',
      'ND II (National Diploma Year 2)',
      'HND I (Higher National Diploma Year 1)',
      'HND II (Higher National Diploma Year 2)',
    ],
  },
  {
    id: 'College of Education',
    name: 'College of Education (Pedagogy)',
    shortLabel: 'College of Education',
    badge: 'NCE & B.Ed Affiliated',
    iconName: 'BookOpen',
    description: 'Teacher training and pedagogical degree affiliated institutions across Nigeria.',
    facultyLabel: 'School',
    levels: [
      'NCE I (Year 1)',
      'NCE II (Year 2)',
      'NCE III (Year 3 Finalist)',
      '100 Level (Degree Affiliated)',
      '200 Level (Degree Affiliated)',
      '300 Level (Degree Affiliated)',
      '400 Level (Degree Affiliated)',
    ],
  },
];

/**
 * Filter institutions by the 3 canonical categories
 */
export function getInstitutionsForCategory(category: HandoutInstitutionCategory): StaticInstitution[] {
  return NIGERIAN_INSTITUTIONS.filter((inst) => {
    if (category === 'University') {
      return inst.category === 'University' || inst.name.toLowerCase().includes('university');
    }
    if (category === 'Polytechnic') {
      return inst.category === 'Polytechnic' || inst.name.toLowerCase().includes('polytechnic') || inst.name.toLowerCase().includes('monotechnic');
    }
    if (category === 'College of Education') {
      return inst.category === 'College of Education' || inst.name.toLowerCase().includes('college of education');
    }
    return false;
  });
}

/**
 * Retrieve faculties/schools for a category
 */
export function getFacultiesForCategory(category: HandoutInstitutionCategory): FacultyItem[] {
  const structure = ACADEMIC_STRUCTURE_BY_CATEGORY[category];
  if (structure && structure.faculties && structure.faculties.length > 0) {
    return structure.faculties;
  }
  return ACADEMIC_STRUCTURE_BY_CATEGORY.University.faculties;
}

/**
 * Retrieve departments for a specific faculty in a category
 */
export function getDepartmentsForFaculty(category: HandoutInstitutionCategory, facultyName: string): string[] {
  const faculties = getFacultiesForCategory(category);
  const matched = faculties.find(
    (f) =>
      f.name.toLowerCase() === facultyName.toLowerCase() ||
      f.shortName?.toLowerCase() === facultyName.toLowerCase() ||
      f.id === facultyName
  );

  if (matched && matched.departments.length > 0) {
    return matched.departments;
  }

  // Fallback search
  for (const f of faculties) {
    if (f.name.toLowerCase().includes(facultyName.toLowerCase())) {
      return f.departments;
    }
  }

  return [];
}

/**
 * Retrieve standard levels for a category
 */
export function getLevelsForCategory(category: HandoutInstitutionCategory): string[] {
  const meta = HANDOUT_INSTITUTION_CATEGORIES.find((c) => c.id === category);
  return meta ? meta.levels : HANDOUT_INSTITUTION_CATEGORIES[0].levels;
}

/**
 * Search accredited courses for a department or retrieve curated ones
 */
export function getCuratedCoursesForDepartment(
  category: HandoutInstitutionCategory,
  departmentName: string,
  level?: string
): CourseItem[] {
  const normalizedDept = departmentName.toLowerCase();

  // Search across ACADEMIC_CURRICULUM_DATA
  const matchedCourses: CourseItem[] = [];

  for (const facData of ACADEMIC_CURRICULUM_DATA) {
    for (const deptData of facData.departments) {
      if (
        deptData.name.toLowerCase().includes(normalizedDept) ||
        normalizedDept.includes(deptData.name.toLowerCase())
      ) {
        matchedCourses.push(...deptData.courses);
      }
    }
  }

  if (matchedCourses.length > 0) {
    if (level) {
      const filtered = matchedCourses.filter((c) => c.level.toLowerCase().includes(level.toLowerCase().slice(0, 3)));
      if (filtered.length > 0) return filtered;
    }
    return matchedCourses;
  }

  // If department isn't found in curriculum table, generate reasonable course suggestions based on department prefix
  const prefix = departmentName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'GST';
  return [
    {
      code: `${prefix} 101`,
      title: `Introduction to ${departmentName} I`,
      level: '100 Level',
      description: `Fundamental principles, history, core methodologies, and foundational concepts of ${departmentName}.`,
      coreTopics: [
        'Historical Foundations & Scope',
        'Basic Theoretical Models',
        'Primary Terminology & Definitions',
        'Standard Methodologies',
      ],
    },
    {
      code: `${prefix} 201`,
      title: `Intermediate ${departmentName} Principles`,
      level: '200 Level',
      description: `In-depth structural concepts, applied methods, and analytical approaches.`,
      coreTopics: [
        'Advanced Principles & Theories',
        'Analytical Formulations & Problem Solving',
        'Contemporary Applications in Nigeria',
        'Experimental & Case Analysis',
      ],
    },
    {
      code: `${prefix} 301`,
      title: `Advanced ${departmentName} & Systems`,
      level: '300 Level',
      description: `Complex paradigms, experimental methods, and professional practices.`,
      coreTopics: [
        'System Dynamics & Frameworks',
        'Quantitative & Qualitative Analysis',
        'Industry Case Studies',
        'Emerging Research Paradigms',
      ],
    },
  ];
}

/**
 * Retrieve suggested topics for a course
 */
export function getSuggestedTopicsForCourse(courseTitleOrCode: string): string[] {
  const normalized = courseTitleOrCode.toLowerCase();
  for (const facData of ACADEMIC_CURRICULUM_DATA) {
    for (const deptData of facData.departments) {
      for (const course of deptData.courses) {
        if (
          course.code.toLowerCase() === normalized ||
          course.title.toLowerCase().includes(normalized) ||
          normalized.includes(course.code.toLowerCase())
        ) {
          return course.coreTopics;
        }
      }
    }
  }

  return [
    'Fundamental Concepts & Definitions',
    'Governing Theories & Laws',
    'Practical Examples & Worked Solutions',
    'Real-World Nigerian Applications',
    'Examination Problems & Review Solutions',
  ];
}
