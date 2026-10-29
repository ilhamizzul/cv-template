// Teks antarmuka dan format tanggal untuk ID/EN.
export const UI = {
  id: {
    menu: 'Menu', jumpTo: 'Lompat ke', close: 'Tutup',
    hero: 'Profil', highlights: 'Sorotan', experience: 'Pengalaman', projects: 'Proyek',
    'case-studies': 'Studi kasus', skills: 'Keahlian', education: 'Pendidikan', contact: 'Kontak',
    organizations: 'Organisasi & kegiatan', certifications: 'Sertifikasi', languages: 'Bahasa', awards: 'Penghargaan',
    present: 'Sekarang', openToRemote: 'Terbuka untuk kerja remote', downloadPdf: 'Unduh CV (PDF)',
    seeExperience: 'Lihat pengalaman', readCase: 'Baca studi kasus', backHome: 'Kembali ke profil',
    problem: 'Masalah', approach: 'Pendekatan', outcome: 'Hasil', gpa: 'IPK', thesis: 'Skripsi',
    confidential: 'Detail pekerjaan ini bersifat rahasia dan bisa dibahas saat wawancara.',
    contactLead: 'Tertarik bekerja sama? Hubungi saya lewat salah satu profil berikut.',
    scanQr: 'Pindai untuk membuka CV ini', switchLang: 'English', credential: 'Lihat kredensial',
    levels: { familiar: 'Dasar', proficient: 'Mahir', advanced: 'Lanjut', expert: 'Ahli' },
    langLevels: { native: 'Bahasa ibu', C2: 'C2 · Fasih', C1: 'C1 · Lancar', B2: 'B2 · Menengah atas', B1: 'B1 · Menengah', A2: 'A2 · Dasar', A1: 'A1 · Pemula' },
    employment: { 'full-time': 'Penuh waktu', contract: 'Kontrak', 'part-time': 'Paruh waktu', internship: 'Magang', freelance: 'Lepas', volunteer: 'Sukarela' },
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    made: 'Dibuat dengan Glowfolio',
  },
  en: {
    menu: 'Menu', jumpTo: 'Jump to', close: 'Close',
    hero: 'Profile', highlights: 'Highlights', experience: 'Experience', projects: 'Projects',
    'case-studies': 'Case studies', skills: 'Skills', education: 'Education', contact: 'Contact',
    organizations: 'Organizations & activities', certifications: 'Certifications', languages: 'Languages', awards: 'Awards',
    present: 'Present', openToRemote: 'Open to remote work', downloadPdf: 'Download CV (PDF)',
    seeExperience: 'See experience', readCase: 'Read the case study', backHome: 'Back to profile',
    problem: 'Problem', approach: 'Approach', outcome: 'Outcome', gpa: 'GPA', thesis: 'Thesis',
    confidential: 'Details of this role are confidential and can be discussed in an interview.',
    contactLead: 'Interested in working together? Reach me through one of these profiles.',
    scanQr: 'Scan to open this CV', switchLang: 'Bahasa Indonesia', credential: 'View credential',
    levels: { familiar: 'Familiar', proficient: 'Proficient', advanced: 'Advanced', expert: 'Expert' },
    langLevels: { native: 'Native', C2: 'C2 · Mastery', C1: 'C1 · Advanced', B2: 'B2 · Upper intermediate', B1: 'B1 · Intermediate', A2: 'A2 · Elementary', A1: 'A1 · Beginner' },
    employment: { 'full-time': 'Full-time', contract: 'Contract', 'part-time': 'Part-time', internship: 'Internship', freelance: 'Freelance', volunteer: 'Volunteer' },
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    made: 'Made with Glowfolio',
  },
};

// Teks dari data: string biasa, atau objek {id, en}. Bila bahasa yang diminta
// tidak ada, pakai bahasa lain yang tersedia.
export function pick(value, lang) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value.id ?? value.en ?? '';
}

export function formatYm(ym, lang) {
  if (!ym) return '';
  if (ym === 'present') return UI[lang].present;
  const [y, m] = ym.split('-');
  return m ? `${UI[lang].months[Number(m) - 1]} ${y}` : y;
}

export function formatPeriod(period, lang) {
  if (!period) return '';
  const start = formatYm(period.start, lang);
  const end = formatYm(period.end ?? 'present', lang);
  return start === end ? start : `${start} – ${end}`;
}
