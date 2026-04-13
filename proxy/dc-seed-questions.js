/**
 * Seed predefined questions for questionnaire sheets when a company is created.
 * Inserts rows into questionnaire_data for infrastructure, it_experience, mst, and building_security.
 *
 * @module dc-seed-questions
 */

const SEED_QUESTIONS = [
  // --- Infrastructure ---
  { sheet_id: 'infrastructure', category: 'Company Overview', question: 'Please provide an organization chart, including areas, positions, headcount, etc' },

  // --- IT Experience ---
  // Devices
  { sheet_id: 'it_experience', category: 'Devices', question: 'Devices (Laptops - Workstations - Tablets - mobile phones) - Please provide the amount of corporate devices assigned to your IT users' },
  { sheet_id: 'it_experience', category: 'Devices', question: 'Aging of Devices - Please provide the amount of corporate devices with +2 years of aging' },
  { sheet_id: 'it_experience', category: 'Devices', question: 'Lease - Please provide the amount of corporate devices in lease' },
  // Architecture
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Multimedia - Please describe multimedia infraestructure per office and meeting rooms' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Operative costs - Please describe your top 3 operative cost per office' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Define possible Service Desk person - Is someone in the company with this profile?' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Define possible Workplace/Facilities person - Is someone in the company with this profile?' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Office layout maps - Is there any space / layout file showing how the office is?' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Layout File - Position assignment with proper # GLOBER - # DESK Occupancy File information' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Meeting Rooms - Share information with Reception to add it to Room information files' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Booking Tool - Do you use any booking app/tool to book for desks or meeting rooms?' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Warehouses - Space in SQ2, inventory of goods' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'HVAC - Status & information of all equipments' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Inventory - Inventory of goods' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Energy - Supplier, Change property name, consumption' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Gas - Supplier, Change property name, consumption' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Water - Supplier, Change property name, consumption' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Cleaning - Cleaning Service?' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Cleaning - Do you have any person dedicated to Cleaning in your payroll?' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Maintenance - Maintenance Service?' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Maintenance - Do you have any person dedicated to Maintenance in your payroll?' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Coffee and Water - Any coffee or water dispenser? What food and drink services do you offer?' },
  { sheet_id: 'it_experience', category: 'Architecture', question: 'Facilities Tools - Where do you store documents and processes? Do you have any Facilities Management tool?' },
  // People
  { sheet_id: 'it_experience', category: 'People', question: 'How is your service desk structured? Roles and responsibilities?' },
  { sheet_id: 'it_experience', category: 'People', question: 'What IT service management framework or methodology do you follow (ITIL, etc)?' },
  { sheet_id: 'it_experience', category: 'People', question: 'What are the typical service desk processes for incident management, request fulfillment, and problem management?' },
  { sheet_id: 'it_experience', category: 'People', question: 'How do you measure and track the performance of your service desk? KPIs?' },
  { sheet_id: 'it_experience', category: 'People', question: 'Can you describe your SLAs and the process for handling service requests by severity?' },
  { sheet_id: 'it_experience', category: 'People', question: 'What tools and technologies do you use to support your service desk operations?' },
  { sheet_id: 'it_experience', category: 'People', question: 'How do you handle knowledge management within your service desk?' },
  { sheet_id: 'it_experience', category: 'People', question: 'What is your approach to user self-service and automation?' },
  { sheet_id: 'it_experience', category: 'People', question: 'How do you handle escalations and major incidents?' },
  { sheet_id: 'it_experience', category: 'People', question: 'What are the biggest challenges in managing the service desk?' },
  // Mobile
  { sheet_id: 'it_experience', category: 'Mobile', question: 'How do you currently handle MDM and MAM? What tools or platforms?' },
  { sheet_id: 'it_experience', category: 'Mobile', question: 'Overview of your mobile telephony support team structure and roles?' },
  { sheet_id: 'it_experience', category: 'Mobile', question: 'What types of mobile devices do you support (iOS, Android, Windows)?' },
  { sheet_id: 'it_experience', category: 'Mobile', question: 'How do you manage mobile device provisioning and onboarding?' },
  { sheet_id: 'it_experience', category: 'Mobile', question: 'What measures for security of mobile devices and data?' },
  { sheet_id: 'it_experience', category: 'Mobile', question: 'What is your approach to mobile application support?' },
  { sheet_id: 'it_experience', category: 'Mobile', question: 'Do you have a mobile expense management system?' },
  { sheet_id: 'it_experience', category: 'Mobile', question: 'How do you manage mobile service providers and vendor relationships?' },
  { sheet_id: 'it_experience', category: 'Mobile', question: 'How do you handle mobile support requests and incidents?' },
  { sheet_id: 'it_experience', category: 'Mobile', question: 'Key challenges in managing mobile telephony support?' },
  // Logistics
  { sheet_id: 'it_experience', category: 'Logistics', question: 'How do you manage and track inventory across logistics operations?' },
  { sheet_id: 'it_experience', category: 'Logistics', question: 'Overview of your order fulfillment process?' },
  { sheet_id: 'it_experience', category: 'Logistics', question: 'What technologies for warehouse management?' },
  { sheet_id: 'it_experience', category: 'Logistics', question: 'How do you handle transportation management?' },
  { sheet_id: 'it_experience', category: 'Logistics', question: 'Approach to managing supplier relationships and procurement?' },
  { sheet_id: 'it_experience', category: 'Logistics', question: 'Measures for quality control and product traceability?' },
  { sheet_id: 'it_experience', category: 'Logistics', question: 'Requirements for handling hazardous materials or regulated products?' },
  { sheet_id: 'it_experience', category: 'Logistics', question: 'How do you handle returns and reverse logistics?' },
  { sheet_id: 'it_experience', category: 'Logistics', question: 'Analytics and reporting for logistics operations?' },
  { sheet_id: 'it_experience', category: 'Logistics', question: 'Biggest challenges in managing logistics operations?' },
  // Workplace Experience
  { sheet_id: 'it_experience', category: 'Workplace Experience', question: 'How do you manage office resources (supplies, furniture, equipment)?' },
  { sheet_id: 'it_experience', category: 'Workplace Experience', question: 'Overview of facilities management practices?' },
  { sheet_id: 'it_experience', category: 'Workplace Experience', question: 'Technologies for visitor management and access control?' },
  { sheet_id: 'it_experience', category: 'Workplace Experience', question: 'Approach to office communication and collaboration tools?' },
  { sheet_id: 'it_experience', category: 'Workplace Experience', question: 'How do you handle office moves or relocations?' },
  { sheet_id: 'it_experience', category: 'Workplace Experience', question: 'Measures for workplace health and safety?' },
  { sheet_id: 'it_experience', category: 'Workplace Experience', question: 'Office space utilization tracking methods?' },
  { sheet_id: 'it_experience', category: 'Workplace Experience', question: 'How do you handle office maintenance requests and SLAs with vendors?' },
  { sheet_id: 'it_experience', category: 'Workplace Experience', question: 'Sustainability initiatives or green practices?' },
  { sheet_id: 'it_experience', category: 'Workplace Experience', question: 'Biggest challenges in managing office operations?' },
  { sheet_id: 'it_experience', category: 'Workplace Experience', question: 'All contract files for IT experience, also warranties for equipment' },

  // --- MST ---
  // ISP
  { sheet_id: 'mst', category: 'ISP', question: 'What contracts do you have with Internet service providers?' },
  // Support Teams
  { sheet_id: 'mst', category: 'Support Teams', question: 'Do you have a specific department or team dedicated to Linux, Windows, and networking support? How many members, location, seniority?' },
  { sheet_id: 'mst', category: 'Support Teams', question: 'Do you have certified members in Linux to give support? What certification?' },
  { sheet_id: 'mst', category: 'Support Teams', question: 'Do you have certified members in Windows to give support? What certification?' },
  { sheet_id: 'mst', category: 'Support Teams', question: 'Do you have certified members in Networking to give support? What certification?' },
  // Cloud
  { sheet_id: 'mst', category: 'Cloud', question: 'Do you have certified members in GCP/Azure/AWS to give support? What certification?' },
  { sheet_id: 'mst', category: 'Cloud', question: 'Do you have services hosted in the cloud? If so, on which platform?' },
  // OS
  { sheet_id: 'mst', category: 'OS', question: 'What version of Linux do you use?' },
  { sheet_id: 'mst', category: 'OS', question: 'What version of Windows do you use?' },
  // Monitoring
  { sheet_id: 'mst', category: 'Monitoring', question: 'What monitoring tool do you use for Networking devices, Unix and Windows servers?' },
  { sheet_id: 'mst', category: 'Monitoring', question: 'Will use Globant offices? Number of people, types of devices, internet access required?' },

  // --- Building Security ---
  // About the Building
  { sheet_id: 'building_security', category: 'About the Building', question: 'Which is the office floor and suite?' },
  { sheet_id: 'building_security', category: 'About the Building', question: 'Does the building lobby have receptionists or security guards?' },
  { sheet_id: 'building_security', category: 'About the Building', question: 'Are there security guards 24/7/365?' },
  { sheet_id: 'building_security', category: 'About the Building', question: 'Are external visitors identified and recorded?' },
  { sheet_id: 'building_security', category: 'About the Building', question: 'Does the building have electronic access control? Type?' },
  { sheet_id: 'building_security', category: 'About the Building', question: 'If proximity cards, how do we get new cards? Procedure?' },
  { sheet_id: 'building_security', category: 'About the Building', question: 'Do employees have 24/7 access? Special permission needed?' },
  { sheet_id: 'building_security', category: 'About the Building', question: 'Does the building have a parking lot?' },
  { sheet_id: 'building_security', category: 'About the Building', question: 'Does the parking have access control?' },
  { sheet_id: 'building_security', category: 'About the Building', question: 'Does the building have a CCTV system? How long are videos stored?' },
  { sheet_id: 'building_security', category: 'About the Building', question: 'Are there cameras in the lobby?' },
  { sheet_id: 'building_security', category: 'About the Building', question: 'Are there cameras in the hall of the office?' },
  { sheet_id: 'building_security', category: 'About the Building', question: 'Does the building have fire detection, protection, and suppression system?' },
  { sheet_id: 'building_security', category: 'About the Building', question: 'Is the office in a risk/dangerous zone?' },
  { sheet_id: 'building_security', category: 'About the Building', question: 'Does the building administration use any software/app for requests?' },
  // About the Office
  { sheet_id: 'building_security', category: 'About the Office', question: 'Is the entire floor occupied by Globant or shared?' },
  { sheet_id: 'building_security', category: 'About the Office', question: 'Does the office have a balcony or terrace? Accessible from surrounding buildings?' },
  { sheet_id: 'building_security', category: 'About the Office', question: 'Does the office have a CCTV system? Describe components' },
  { sheet_id: 'building_security', category: 'About the Office', question: 'DVR: hardware or software, brand, model, storage capacity?' },
  { sheet_id: 'building_security', category: 'About the Office', question: 'Cameras: digital or analog, brands, models, layout?' },
  { sheet_id: 'building_security', category: 'About the Office', question: 'Storage: How long are videos stored?' },
  { sheet_id: 'building_security', category: 'About the Office', question: 'Does the office have electronic access control (EAC)? Brand and model?' },
  { sheet_id: 'building_security', category: 'About the Office', question: 'What kind? Proximity Cards, Biometric, Keypads?' },
  { sheet_id: 'building_security', category: 'About the Office', question: 'Does the office have an intruder detection system? Brand and model?' },
  { sheet_id: 'building_security', category: 'About the Office', question: 'Does the office have fire detection (FDS), protection and suppression? Brand and model?' },
  { sheet_id: 'building_security', category: 'About the Office', question: 'If FDS, is it integrated with the building fire detection system?' },
  // Support and Maintenance
  { sheet_id: 'building_security', category: 'Support and Maintenance', question: 'Does the office receive regular support or maintenance of security systems? Provider and type?' },
];

/**
 * Seeds predefined questions into questionnaire_data for a newly created company.
 * Uses a transaction for atomicity. Auto-increments question_id per sheet.
 * @param {import('better-sqlite3').Database} db
 * @param {number} companyId
 */
function seedCompanyQuestions(db, companyId) {
  const insert = db.prepare(
    'INSERT INTO questionnaire_data (company_id, sheet_id, category, question_id, question) VALUES (?, ?, ?, ?, ?)'
  );

  const runSeed = db.transaction(() => {
    const counters = {};
    for (const q of SEED_QUESTIONS) {
      if (!counters[q.sheet_id]) counters[q.sheet_id] = 0;
      counters[q.sheet_id]++;
      insert.run(companyId, q.sheet_id, q.category, String(counters[q.sheet_id]), q.question);
    }
  });

  runSeed();
}

module.exports = { seedCompanyQuestions, SEED_QUESTIONS };
