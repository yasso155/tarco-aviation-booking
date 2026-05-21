const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// I will define the footer completely to avoid tag mismatch issues.
// 1. Locate the footer block
const footerStartMarker = '{/* Footer */}';
const footerEndMarker = '</footer>';

const footerStartIdx = content.indexOf(footerStartMarker);
const footerEndIdx = content.indexOf(footerEndMarker, footerStartIdx) + footerEndMarker.length;

if (footerStartIdx === -1 || footerEndIdx === -1) {
    console.error('Could not find footer block');
    process.exit(1);
}

const newFooter = `{/* Footer */}
      <footer className="mt-24 bg-tarco-blue py-24 px-6 text-white">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <img 
              src={assets['logo_footer'] || "/Images/logo_footer.png"} 
              alt="Tarco Aviation" 
              className="h-12 w-auto brightness-0 invert"
              referrerPolicy="no-referrer"
            />
            <div className="flex gap-12 text-xs font-bold uppercase tracking-widest">
              <a href="#" className="hover:text-tarco-gold transition-colors">{lang === 'en' ? 'Privacy' : 'الخصوصية'}</a>
              <a href="#" className="hover:text-tarco-gold transition-colors">{lang === 'en' ? 'Terms' : 'الشروط'}</a>
              <a href="#" className="hover:text-tarco-gold transition-colors">{lang === 'en' ? 'Contact' : 'اتصل بنا'}</a>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pt-16 border-t border-white/10">
            <div className="space-y-4">
              <h4 className="text-tarco-gold font-black uppercase tracking-widest text-xs">{lang === 'en' ? 'About Tarco' : 'عن تاركو'}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t.excellence.desc}
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-tarco-gold font-black uppercase tracking-widest text-xs">{lang === 'en' ? 'Our Network' : 'شبكة وجهاتنا'}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                {lang === 'en' ? 'Connecting major cities including Khartoum, Dubai, Riyadh, Cairo, and Addis Ababa with modern aircraft and exceptional service.' : 'نربط المدن الكبرى بما في ذلك الخرطوم ودبي والرياض والقاهرة وأديس أبابا بطائرات حديثة وخدمة استثنائية.'}
              </p>
            </div>
            <div className="space-y-4">
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
            <div className="space-y-4">
              <h4 className="text-tarco-gold font-black uppercase tracking-widest text-xs">{lang === 'en' ? 'Newsletter' : 'النشرة البريدية'}</h4>
              <div className="flex gap-2">
                <input className="bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-sm flex-1 outline-none focus:border-tarco-gold" placeholder={lang === 'en' ? 'Email Address' : 'البريد الإلكتروني'} />
                <button className="bg-tarco-red px-4 py-2 rounded-lg font-bold text-xs">{lang === 'en' ? 'Join' : 'اشترك'}</button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-16 border-t border-white/10 text-[10px] text-slate-500 font-medium uppercase tracking-widest">
            <p>© 2026 {t.brand.first} {t.brand.second}. All rights reserved.</p>
            <div className="flex items-center gap-6">
              {user?.email === 'YSeddig15@gmail.com' && (
                <a 
                  href="https://console.firebase.google.com/project/gen-lang-client-0834655921/firestore/databases/ai-studio-2c905c97-48ea-4e14-877c-1bd9ef21ebd9/data" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-tarco-gold hover:underline flex items-center gap-2"
                >
                  <ShieldCheck size={12} />
                  Manage Assets
                </a>
              )}
              <p>The Legend of Africa</p>
            </div>
          </div>
        </div>
      </footer>`;

content = content.substring(0, footerStartIdx) + newFooter + content.substring(footerEndIdx);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Successfully reconstructed footer in App.tsx');
