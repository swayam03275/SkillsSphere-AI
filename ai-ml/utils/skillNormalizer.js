/**
 * Comprehensive mapping of skill synonyms to canonical forms.
 * Keys should be lowercase and stripped of special characters (collapsed)
 * to ensure maximum matching robustness.
 */
const SKILL_MAP = {
  // Languages
  'js': 'javascript',
  'javascript': 'javascript',
  'ts': 'typescript',
  'typescript': 'typescript',
  'py': 'python',
  'python': 'python',
  'csharp': 'csharp',
  'c#': 'csharp',
  'cpp': 'c++',
  'c++': 'c++',
  'golang': 'go',
  'go': 'go',
  'rust': 'rust',
  'rb': 'ruby',
  'ruby': 'ruby',

  // Frameworks & Libraries
  'react': 'react',
  'reactjs': 'react',
  'react.js': 'react',
  'vue': 'vuejs',
  'vuejs': 'vuejs',
  'vue.js': 'vuejs',
  'angular': 'angular',
  'angularjs': 'angular',
  'node': 'nodejs',
  'nodejs': 'nodejs',
  'node.js': 'nodejs',
  'express': 'express',
  'expressjs': 'express',

  // Databases
  'mongo': 'mongodb',
  'mongodb': 'mongodb',
  'postgres': 'postgresql',
  'postgresql': 'postgresql',
  'pg': 'postgresql',
  'sqlserver': 'sql server',
  'mysql': 'mysql',
  'redis': 'redis',

  // DevOps & Cloud
  'k8s': 'kubernetes',
  'kubernetes': 'kubernetes',
  'docker': 'docker',
  'aws': 'aws',
  'amazonwebservices': 'aws',
  'gcp': 'gcp',
  'googlecloud': 'gcp',
  'azure': 'azure',
  'terraform': 'terraform',
  'ansible': 'ansible',
// AI / ML & Data Science
  'tensorflow': 'tensorflow',
  'tf': 'tensorflow',
  'pytorch': 'pytorch',
  'opencv': 'opencv',
  'scikit-learn': 'scikit-learn',
  'sklearn': 'scikit-learn',
  'tflite': 'tensorflow lite',
  'fastapi': 'fastapi',
  'pydantic': 'pydantic',
  'cryptography': 'cryptography',
  'crypto': 'cryptography',
  'steganography': 'steganography'
  // Others
  'dotnet': 'dotnet',
  '.net': 'dotnet',
  'git': 'git',
  'github': 'github',
  'rest': 'rest api',
  'restful': 'rest api',
  'graphql': 'graphql'
};

/**
 * Normalizes a single skill string.
 * Uses a multi-tiered approach:
 * 1. Direct synonym match (e.g., "js" -> "javascript")
 * 2. Collapsed synonym match (e.g., "node js" -> "nodejs" -> "node.js")
 * 3. Collapsed fallback for unknown skills (e.g., "My-Skill" -> "myskill")
 * 
 * @param {string} skill 
 * @returns {string} Normalized canonical form
 */
export const normalizeSkill = (skill) => {
  if (!skill || typeof skill !== 'string') return '';

  const trimmed = skill.toLowerCase().trim();
  
  // Tier 1: Direct match (e.g., "node.js", "c#")
  if (SKILL_MAP[trimmed]) return SKILL_MAP[trimmed];

  // Tier 2: Collapsed match (remove spaces, dots, hyphens, etc.)
  const collapsed = trimmed.replace(/[^a-z0-9+#]/g, '');
  if (SKILL_MAP[collapsed]) return SKILL_MAP[collapsed];

  // Tier 3: Robust Fallback
  // If no synonym is found, we use the collapsed version as the canonical match key.
  // This ensures that "Super-Skill" and "Super Skill" match as "superskill" 
  // even if they aren't in our predefined SKILL_MAP.
  return collapsed || trimmed;
};

/**
 * Normalizes an array of skills, removes duplicates and empty values.
 * @param {string[]} skills 
 * @returns {string[]}
 */
export const normalizeSkillArray = (skills) => {
  if (!Array.isArray(skills)) return [];
  
  const normalized = skills
    .map(s => normalizeSkill(s))
    .filter(s => s.length > 0);
    
  return [...new Set(normalized)];
};

/**
 * Extracts known skills from raw text by matching against SKILL_MAP keys and a master keyword list.
 * @param {string} text - The raw text (e.g. Job Description)
 * @param {string[]} masterList - Array of all known technical keywords
 * @returns {string[]} Array of normalized skills found in the text
 */
export const extractSkillsFromText = (text = "", masterList = []) => {
  if (!text) return [];
  
  const lowerText = text.toLowerCase()
    .replace(/[^\w\s.+#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Combine SKILL_MAP keys with master list for maximum coverage
  const searchTerms = [...new Set([
    ...Object.keys(SKILL_MAP),
    ...masterList.map(k => k.toLowerCase())
  ])];

  const found = searchTerms.filter(term => {
    // For short terms, use boundary check
    if (term.length <= 3) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9+#.])${escaped}([^a-zA-Z0-9+#.]|$)`, 'i');
      return regex.test(lowerText);
    }
    return lowerText.includes(term);
  });

  return normalizeSkillArray(found);
};
