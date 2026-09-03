/**
 * Generates a realistic ~2,000-student (+ guardians) and ~60-staff dataset for Shri Hansraj
 * Career Inter College, matching a Hindi-speaking eastern-UP register: real Hindu and Muslim
 * given names and surnames common in the Jaunpur district, not "Test User 1". This is used by
 * import-volume.test.ts as BOTH the actual seed data for developing against and the volume
 * proof for the import pipeline -- one dataset, not two, run through the real
 * stage/validate/commit functions rather than inserted directly.
 */

// Deterministic PRNG (mulberry32) so the dataset is reproducible across runs.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MALE_FIRST_NAMES = [
  "Ravi", "Amit", "Suresh", "Rajesh", "Vikas", "Manoj", "Sanjay", "Anil", "Ashok", "Dinesh",
  "Vinod", "Ajay", "Rakesh", "Naveen", "Pankaj", "Sunil", "Ramesh", "Deepak", "Vijay", "Arun",
  "Sandeep", "Mahesh", "Prakash", "Yogesh", "Satish", "Umesh", "Brijesh", "Chandan", "Gaurav",
  "Ankit", "Vishal", "Rohit", "Manish", "Praveen", "Alok", "Vivek", "Kamlesh", "Shyam", "Mohammad",
  "Aslam", "Irfan", "Salman", "Aamir", "Naeem", "Sartaj", "Aftab", "Rizwan", "Shakeel", "Zubair",
  "Faisal", "Kamran", "Nadeem", "Tariq", "Yusuf", "Imran", "Danish", "Wasim", "Anwar", "Shahid",
];

const FEMALE_FIRST_NAMES = [
  "Sunita", "Pooja", "Anita", "Kavita", "Rekha", "Meena", "Geeta", "Nisha", "Priya", "Neha",
  "Ritu", "Shobha", "Kiran", "Sarita", "Usha", "Manju", "Seema", "Anjali", "Deepa", "Kajal",
  "Suman", "Radha", "Laxmi", "Savitri", "Kamla", "Fatima", "Ayesha", "Nazia", "Rukhsar", "Shabana",
  "Sabina", "Farha", "Nasreen", "Yasmin", "Rehana", "Shazia", "Naseem", "Poonam", "Renu", "Babita",
];

const SURNAMES = [
  "Kumar", "Yadav", "Singh", "Verma", "Gupta", "Mishra", "Pandey", "Tiwari", "Sharma", "Chauhan",
  "Rajbhar", "Maurya", "Prajapati", "Vishwakarma", "Gautam", "Kushwaha", "Patel", "Jaiswal",
  "Srivastava", "Dubey", "Shukla", "Khan", "Ansari", "Siddiqui", "Qureshi", "Malik", "Sheikh",
  "Pathan", "Chaudhary", "Rawat",
];

const DEPARTMENTS = ["Science", "Mathematics", "Languages", "Social Science", "Administration", "Physical Education"];
const DESIGNATIONS = ["PGT", "TGT", "PRT", "Clerk"];
const CATEGORIES = ["general", "general", "general", "obc", "obc", "sc", "st", "ews"]; // weighted
const CLASSES = ["6", "7", "8", "9", "10", "11", "12"];
const SECTIONS = ["A", "B", "C", "D", "E", "F"];

export interface StudentRow {
  admission_number: string;
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  category_key: string;
  house_name: string;
  class_name: string;
  section_name: string;
  roll_number: string;
  guardian1_name: string;
  guardian1_relationship: string;
  guardian1_phone: string;
  guardian2_name: string;
  guardian2_relationship: string;
  guardian2_phone: string;
}

export interface StaffRow {
  employee_code: string;
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  department_name: string;
  designation_name: string;
  joining_date: string;
}

function pick<T>(rng: () => number, arr: T[]): T {
  const item = arr[Math.floor(rng() * arr.length)];
  if (item === undefined) throw new Error("pick() from empty array");
  return item;
}

function phone(rng: () => number): string {
  return "9" + String(Math.floor(rng() * 900000000) + 100000000);
}

function dobForClass(rng: () => number, className: string): string {
  const age = Number(className) + 5 + Math.floor(rng() * 2); // rough age-for-class + jitter
  const year = 2026 - age;
  const month = String(Math.floor(rng() * 12) + 1).padStart(2, "0");
  const day = String(Math.floor(rng() * 28) + 1).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function generateStudents(count: number, seed = 42): StudentRow[] {
  const rng = mulberry32(seed);
  const rows: StudentRow[] = [];
  const rollCounters = new Map<string, number>();

  for (let i = 0; i < count; i += 1) {
    const isMale = rng() > 0.48;
    const firstName = pick(rng, isMale ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES);
    const surname = pick(rng, SURNAMES);
    const className = CLASSES[i % CLASSES.length] as string;
    const sectionName = pick(rng, SECTIONS);
    const rollKey = `${className}-${sectionName}`;
    const nextRoll = (rollCounters.get(rollKey) ?? 0) + 1;
    rollCounters.set(rollKey, nextRoll);

    const fatherName = `${pick(rng, MALE_FIRST_NAMES)} ${surname}`;
    const motherName = `${pick(rng, FEMALE_FIRST_NAMES)} ${surname}`;

    rows.push({
      admission_number: "", // blank -- match_mode 'none' auto-generates via fn_next_school_number
      first_name: firstName,
      last_name: surname,
      dob: dobForClass(rng, className),
      gender: isMale ? "male" : "female",
      category_key: pick(rng, CATEGORIES),
      house_name: pick(rng, ["Ashoka", "Gandhi", "Nehru", "Tagore"]),
      class_name: className,
      section_name: sectionName,
      roll_number: String(nextRoll),
      guardian1_name: fatherName,
      guardian1_relationship: "father",
      guardian1_phone: phone(rng),
      guardian2_name: motherName,
      guardian2_relationship: "mother",
      guardian2_phone: phone(rng),
    });
  }

  return rows;
}

export function generateStaff(count: number, seed = 99): StaffRow[] {
  const rng = mulberry32(seed);
  const rows: StaffRow[] = [];

  for (let i = 0; i < count; i += 1) {
    const isMale = rng() > 0.4;
    const firstName = pick(rng, isMale ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES);
    const surname = pick(rng, SURNAMES);
    const joinYear = 2010 + Math.floor(rng() * 15);

    rows.push({
      employee_code: "",
      first_name: firstName,
      last_name: surname,
      dob: `${1970 + Math.floor(rng() * 25)}-0${Math.floor(rng() * 9) + 1}-15`,
      gender: isMale ? "male" : "female",
      phone: phone(rng),
      email: `${firstName.toLowerCase()}.${surname.toLowerCase()}${i}@hansraj.schoolerp.test`,
      department_name: pick(rng, DEPARTMENTS),
      designation_name: pick(rng, DESIGNATIONS),
      joining_date: `${joinYear}-06-01`,
    });
  }

  return rows;
}
