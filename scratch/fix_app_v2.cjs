const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// 1. Fix the corruption in the footer
// The corruption looks like: ,ReplacementChunks:[{AllowMultiple:false,EndLine:2390,ReplacementContent:
content = content.replace(/,ReplacementChunks:\[\{AllowMultiple:false,EndLine:\d+,ReplacementContent:/g, '');

// 2. Fix the translations corruption and add the new objects
// I'll reconstruct the TRANSLATIONS.en and TRANSLATIONS.ar objects partially to ensure they are correct.

const enExcellenceAndContact = `    excellence: {
      title: 'Excellence in Service',
      subtitle: 'Award-winning Sudanese hospitality',
      desc: 'Connecting Sudan to the world with our modern B737-800NG fleet and world-class Sudanese hospitality.',
      point1: 'Safety and Comfort First',
      point2: 'Professional Cabin Crew',
      point3: 'Modern Fleet'
    },
    contacts: {
      headOffice: 'Head Office (Khartoum)',
      madaniOffice: 'Madani Office',
      headAddress: 'Omack Street, Khartoum',
      madaniAddress: 'Shikan Tower, Al-Masah Street'
    }
  },`;

const arExcellenceAndContact = `    excellence: {
      title: 'التميز في الخدمة',
      subtitle: 'ضيافة سودانية حائزة على جوائز',
      desc: 'نربط السودان بالعالم مع أسطولنا الحديث B737-800NG وكرم الضيافة السوداني العالمي.',
      point1: 'السلامة والراحة أولاً',
      point2: 'طاقم ضيافة محترف',
      point3: 'أسطول حديث'
    },
    contacts: {
      headOffice: 'المكتب الرئيسي (الخرطوم)',
      madaniOffice: 'مكتب مدني',
      headAddress: 'شارع أوماك، الخرطوم',
      madaniAddress: 'برج شيكان، شارع الماسه'
    }
  }
};`;

// Replace the end of 'en' block
// Previous state ended with 'popular: 'Popular' }' (approx)
content = content.replace(/popular: 'Popular'\s*\}\s*\},/m, `popular: 'Popular'\n    },\n${enExcellenceAndContact}\n`);

// Replace the end of 'ar' block
content = content.replace(/popular: 'شائع'\s*\}\s*\}\s*\};/m, `popular: 'شائع'\n    }\n  }\n};\n`);
// Wait, I should just use the above constructed arExcellenceAndContact
content = content.replace(/popular: 'شائع'\s*\}\s*\}\s*\};/m, `popular: 'شائع'\n    },\n${arExcellenceAndContact}`);

// 3. Update the footer grid to 4 columns
content = content.replace(/<div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-16 border-t border-white\/10">/, '<div className="grid grid-cols-1 md:grid-cols-4 gap-12 pt-16 border-t border-white/10">');

// 4. Add the new footer column before the newsletter column
const newsletterHeader = `<h4 className="text-tarco-gold font-black uppercase tracking-widest text-xs">{lang === 'en' ? 'Newsletter' : 'النشرة البريدية'}</h4>`;
const officeColumn = `            <div className="space-y-4">
              <h4 className="text-tarco-gold font-black uppercase tracking-widest text-xs">{lang === 'en' ? 'Our Offices' : 'مكاتبنا'}</h4>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <MapPin size={10} className="text-tarco-gold" />
                    {t.contacts.headOffice}
                  </p>
                  <p className="text-xs text-slate-400">{t.contacts.headAddress}</p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-2">
                    <Mail size={10} />
                    we.care@tarcoaviation.com
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <MapPin size={10} className="text-tarco-gold" />
                    {t.contacts.madaniOffice}
                  </p>
                  <p className="text-xs text-slate-400">{t.contacts.madaniAddress}</p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-2">
                    <Phone size={10} />
                    0120011082
                  </p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-2">
                    <Mail size={10} />
                    madani.office@tarcoaviation.com
                  </p>
                </div>
              </div>
            </div>
`;

content = content.replace(/<div className="space-y-4">\s*<h4 className="text-tarco-gold font-black uppercase tracking-widest text-xs">\{lang === 'en' \? 'Newsletter' : 'النشرة البريدية'\}<\/h4>/, officeColumn + '            <div className="space-y-4">\n              ' + newsletterHeader);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Successfully repaired and updated App.tsx');
