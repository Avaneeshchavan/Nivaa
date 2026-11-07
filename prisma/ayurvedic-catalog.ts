// Names and formulation categories from the National AYUSH Mission EDL.
// https://namayush.gov.in/content/essential-drugs-list-ayurveda
// Deliberately contains no doses, instructions, pack sizes, or indications.
const formulations: Record<string, string[]> = {
  Churna: [
    'Ajamodadi Churna', 'Avipattikara Churna', 'Balachaturbhadra Churna',
    'Bilvadi Churna', 'Dadimastak Churna', 'Eladi Churna', 'Hingvashtaka Churna',
    'Nisha-Amalaki Churna', 'Pushyanuga Churna', 'Panchanimba Churna',
    'Sitopaladi Churna', 'Talishadya Churna', 'Trikatu Churna', 'Triphala Churna',
    'Amalaki Churna', 'Arjuna Churna', 'Ashvagandha Churna', 'Gokshura Churna',
    'Guduchi Churna', 'Haritaki Churna', 'Pippali Churna', 'Punarnava Churna',
    'Shunthi Churna', 'Sarasvata Churna', 'Vidanga Churna',
  ],
  'Kvatha / Kashaya Churna': [
    'Dashamula Kvatha Churna', 'Dhanyapanchaka Kashaya Churna',
    'Guduchyadi Kashaya Churna', 'Indukantam Kashayam Churna',
    'Phalatrikadi Kvatha Churna', 'Rasnasaptaka Kashaya Churna',
    'Shadanga Kvatha Churna', 'Varunadi Kvatha Churna', 'Vasaguduchyadi Kashaya Churna',
  ],
  Guggulu: [
    'Amritadi Guggulu', 'Gokshuradi Guggulu', 'Kanchanara Guggulu',
    'Kaishora Guggulu', 'Lakshadi Guggulu', 'Navak Guggulu', 'Rasna Guggulu',
    'Simhanada Guggulu', 'Saptavinshati Guggulu', 'Triphala Guggulu',
  ],
  Taila: ['Bala Taila', 'Balashvagandhadi Taila', 'Eranda Taila', 'Erimedadi Taila', 'Gandharvahasta Taila'],
  Arishta: ['Abhayarishtha', 'Amritarishta', 'Ashokarishta', 'Ashvagandharishta', 'Balarishta', 'Dashamularishta', 'Draksharishta', 'Kutajarishta', 'Khadirarishta', 'Mustakarishta'],
  Asava: ['Aravindasava', 'Chandanasava', 'Drakshasava', 'Kanakasava', 'Kumaryasava', 'Lohasava'],
}

export const ayurvedicCatalog = Object.entries(formulations).flatMap(([form, names]) =>
  names.map(name => ({ name, form, system: 'AYURVEDIC' as const,
    ...(name.startsWith('Ashvagandha') ? { generic: name.replace('Ashvagandha', 'Ashwagandha') } : {}),
  }))
)
