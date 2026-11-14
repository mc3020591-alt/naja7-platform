import React, { useEffect, useMemo, useState } from "react";
import {
  GraduationCap, Search, BookOpen, FileText, Bot, Moon, Sun, Menu, X, ArrowLeft,
  Download, Eye, Bookmark, BookmarkCheck, ChevronLeft, Sparkles, ShieldCheck,
  LayoutDashboard, UploadCloud, LogIn, LogOut, Languages, Filter, Clock3, Library,
  MessageCircle, Send, Paperclip, CircleHelp, CheckCircle2, AlertCircle, Trash2
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { LEVELS, SUBJECTS, TYPES } from "./data";

const txt = (item, lang, a="ar", f="fr") => item?.[lang === "ar" ? a : f] || "";
const niceDate = d => d ? new Date(d).toLocaleDateString("fr-MA") : "";
const notify = (message) => window.dispatchEvent(new CustomEvent("naja7-toast",{detail:message}));

function App(){
  const [lang,setLang]=useState("ar"), [dark,setDark]=useState(true), [page,setPage]=useState("home");
  const [mobile,setMobile]=useState(false), [query,setQuery]=useState(""), [level,setLevel]=useState("all");
  const [kind,setKind]=useState("all"), [subject,setSubject]=useState("all"), [items,setItems]=useState([]);
  const [session,setSession]=useState(null), [profile,setProfile]=useState(null), [favorites,setFavorites]=useState([]);
  const [loading,setLoading]=useState(true), [selected,setSelected]=useState(null), [toast,setToast]=useState("");
  const [showAuth,setShowAuth]=useState(false), [authMode,setAuthMode]=useState("signin");
  const [showUpload,setShowUpload]=useState(false), [adminTab,setAdminTab]=useState("resources");
  const [chat,setChat]=useState([]), [prompt,setPrompt]=useState(""), [aiBusy,setAiBusy]=useState(false);
  const [aiLevel,setAiLevel]=useState("2bac"), [aiSubject,setAiSubject]=useState("math");
  const [authEmail,setAuthEmail]=useState(""), [authPassword,setAuthPassword]=useState("");
  const [authName,setAuthName]=useState("");
  const [uploadTitle,setUploadTitle]=useState(""), [uploadDesc,setUploadDesc]=useState("");
  const [uploadLevel,setUploadLevel]=useState("2bac"), [uploadSubject,setUploadSubject]=useState("math");
  const [uploadType,setUploadType]=useState("lesson"), [uploadFile,setUploadFile]=useState(null);
  const [uploadYear,setUploadYear]=useState(new Date().getFullYear()), [uploadTrack,setUploadTrack]=useState("");
  const [uploadBusy,setUploadBusy]=useState(false);

  const ar=lang==="ar";
  const t=(a,f)=>ar?a:f;
  const isAdmin=profile?.role==="admin";
  const nav=[["home",t("الرئيسية","Accueil"),BookOpen],["library",t("مكتبة PDF","Bibliothèque PDF"),Library],["exams",t("الامتحانات","Examens"),FileText],["ai", "NAJA7 AI",Bot],["favorites",t("المفضلة","Favoris"),Bookmark],...(isAdmin?[["admin","Admin",LayoutDashboard]]:[])];

  useEffect(()=>{
    document.documentElement.lang=lang; document.documentElement.dir=ar?"rtl":"ltr";
    document.body.dataset.theme=dark?"dark":"light";
  },[lang,dark]);

  useEffect(()=>{
    const handler=e=>{setToast(e.detail);setTimeout(()=>setToast(""),3200)};
    window.addEventListener("naja7-toast",handler);return()=>window.removeEventListener("naja7-toast",handler);
  },[]);

  useEffect(()=>{
    if(!supabase){setLoading(false);return;}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);});
    return()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!supabase||!session?.user){setProfile(null);setFavorites([]);return;}
    let alive=true;
    (async()=>{
      const [{data:p},{data:f}]=await Promise.all([
        supabase.from("profiles").select("id,display_name,role").eq("id",session.user.id).maybeSingle(),
        supabase.from("favorites").select("resource_id").eq("user_id",session.user.id)
      ]);
      if(alive){setProfile(p);setFavorites((f||[]).map(x=>x.resource_id));}
    })();
    return()=>{alive=false};
  },[session]);

  async function loadResources(){
    setLoading(true);
    if(!supabase){setItems([]);setLoading(false);return;}
    let req=supabase.from("resources").select("id,title,description,level,subject,kind,year,track,file_path,file_size,created_at,is_published").eq("is_published",true).order("created_at",{ascending:false}).limit(200);
    const {data,error}=await req;
    if(error)notify(t("تعذر تحميل المحتوى. تحقق من إعداد قاعدة البيانات.","Impossible de charger le contenu. Vérifiez la base de données."));
    setItems(data||[]);setLoading(false);
  }
  useEffect(()=>{loadResources()},[]);

  const filtered=useMemo(()=>items.filter(x=>{
    const q=query.trim().toLowerCase();
    const hay=[x.title,x.description,x.level,x.subject,x.kind,String(x.year||"")].join(" ").toLowerCase();
    return (!q||hay.includes(q))&&(level==="all"||x.level===level)&&(subject==="all"||x.subject===subject)&&
      (kind==="all"||x.kind===kind)&&(page!=="exams"||["regional","national"].includes(x.kind))&&
      (page!=="favorites"||favorites.includes(x.id));
  }),[items,query,level,subject,kind,page,favorites]);

  async function toggleFavorite(id){
    if(!session){setShowAuth(true);return;}
    if(favorites.includes(id)){
      const {error}=await supabase.from("favorites").delete().eq("resource_id",id).eq("user_id",session.user.id);
      if(!error)setFavorites(v=>v.filter(x=>x!==id));
    }else{
      const {error}=await supabase.from("favorites").insert({resource_id:id,user_id:session.user.id});
      if(!error)setFavorites(v=>[...v,id]);else notify(t("تعذر حفظ المفضلة.","Impossible d'enregistrer le favori."));
    }
  }

  async function openResource(item){
    setSelected(item);
    const {data,error}=await supabase.storage.from("study-pdfs").createSignedUrl(item.file_path,900);
    if(error){notify(t("تعذر فتح الملف. تحقق من وجوده في التخزين.","Impossible d'ouvrir le fichier."));return;}
    setSelected({...item,signedUrl:data.signedUrl});
  }

  async function authSubmit(e){
    e.preventDefault(); if(!supabase)return;
    let result;
    if(authMode==="signup"){
      result=await supabase.auth.signUp({email:authEmail,password:authPassword,options:{data:{display_name:authName}}});
      if(!result.error)notify(t("تم إنشاء الحساب. تحقق من بريدك إذا طُلب ذلك.","Compte créé. Vérifiez votre e-mail si nécessaire."));
    }else result=await supabase.auth.signInWithPassword({email:authEmail,password:authPassword});
    if(result.error)notify(result.error.message);else setShowAuth(false);
  }

  async function signOut(){await supabase.auth.signOut();setPage("home");}

  async function sendAI(e){
    e.preventDefault();const q=prompt.trim();if(!q||aiBusy)return;
    const next=[...chat,{role:"user",content:q}];setChat(next);setPrompt("");setAiBusy(true);
    if(!session){setAiBusy(false);setChat(v=>[...v,{role:"assistant",content:t("سجّل الدخول لاستعمال المساعد وحفظ محادثتك.","Connectez-vous pour utiliser l'assistant et conserver votre conversation.")}]);return;}
    try{
      const {data,error}=await supabase.functions.invoke("naja7-ai",{body:{messages:next.map(m=>({role:m.role,content:m.content})),level:aiLevel,subject:aiSubject,language:lang}});
      if(error)throw error;
      setChat(v=>[...v,{role:"assistant",content:data?.answer||t("لم أتمكن من إنشاء جواب.","Je n'ai pas pu générer une réponse.")}]);
    }catch(err){setChat(v=>[...v,{role:"assistant",content:t("حدث خطأ في الاتصال بالمساعد. تأكد من نشر دالة NAJA7 AI وإعداد مفتاح API على الخادم.","Erreur de connexion. Vérifiez le déploiement de la fonction NAJA7 AI et sa clé API côté serveur.")}]);}
    finally{setAiBusy(false);}
  }

  async function uploadSubmit(e){
    e.preventDefault();
    if(!isAdmin){notify(t("هذه العملية خاصة بالمدير.","Action réservée à l'administrateur."));return;}
    if(!uploadFile||uploadFile.type!=="application/pdf"){notify(t("اختر ملف PDF صالحاً.","Choisissez un fichier PDF valide."));return;}
    if(uploadFile.size>25*1024*1024){notify(t("الحد الأقصى لحجم الملف 25MB.","Taille maximale : 25 Mo."));return;}
    setUploadBusy(true);
    const safeName=uploadFile.name.normalize("NFKD").replace(/[^\w.-]+/g,"-");
    const path=`${uploadLevel}/${Date.now()}-${safeName}`;
    const {error:storageError}=await supabase.storage.from("study-pdfs").upload(path,uploadFile,{contentType:"application/pdf",upsert:false});
    if(storageError){notify(storageError.message);setUploadBusy(false);return;}
    const {error}=await supabase.from("resources").insert({
      title:uploadTitle,description:uploadDesc,level:uploadLevel,subject:uploadSubject,kind:uploadType,
      year:Number(uploadYear)||null,track:uploadTrack||null,file_path:path,file_size:uploadFile.size,is_published:true
    });
    if(error){await supabase.storage.from("study-pdfs").remove([path]);notify(error.message);}
    else{notify(t("تم نشر الملف بنجاح.","Fichier publié avec succès."));setShowUpload(false);setUploadTitle("");setUploadDesc("");setUploadFile(null);loadResources();}
    setUploadBusy(false);
  }

  async function deleteResource(item){
    if(!isAdmin||!confirm(t("هل تريد حذف هذا الملف؟","Supprimer ce fichier ?")))return;
    await supabase.storage.from("study-pdfs").remove([item.file_path]);
    const {error}=await supabase.from("resources").delete().eq("id",item.id);
    if(error)notify(error.message);else{setItems(v=>v.filter(x=>x.id!==item.id));notify(t("تم حذف الملف.","Fichier supprimé."));}
  }

  const go=p=>{setPage(p);setMobile(false);setSelected(null);if(p==="library"){setKind("all")}if(p==="exams"){setKind("all")}};
  const labelLevel=id=>{const x=LEVELS.find(v=>v.id===id);return x?txt(x,lang,"ar","fr"):id};
  const labelSubject=id=>{const x=SUBJECTS.find(v=>v.id===id);return x?txt(x,lang,"ar","fr"):id};
  const labelType=id=>{const x=TYPES.find(v=>v.id===id);return x?txt(x,lang):id};
  const fmtSize=n=>n?`${(n/1024/1024).toFixed(1)} MB`:"—";

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={()=>go("home")} aria-label="NAJA7 home"><span className="brand-mark"><GraduationCap size={25}/></span><span><b>NAJA7</b><small>{t("طريقك نحو النجاح","Votre chemin vers la réussite")}</small></span></button>
      <nav className="desktop-nav">{nav.map(([id,name,Icon])=><button key={id} className={page===id?"nav-link active":"nav-link"} onClick={()=>go(id)}><Icon size={17}/>{name}</button>)}</nav>
      <div className="top-actions">
        <button className="icon-btn" onClick={()=>setLang(ar?"fr":"ar")} title="Language"><Languages size={18}/><span>{ar?"FR":"ع"}</span></button>
        <button className="icon-btn" onClick={()=>setDark(v=>!v)} title="Theme">{dark?<Sun size={18}/>:<Moon size={18}/>}</button>
        {session?<button className="account-btn" onClick={signOut}><LogOut size={16}/><span>{t("خروج","Sortir")}</span></button>:<button className="account-btn" onClick={()=>setShowAuth(true)}><LogIn size={16}/><span>{t("دخول","Connexion")}</span></button>}
        <button className="icon-btn mobile-menu" onClick={()=>setMobile(v=>!v)}><Menu size={20}/></button>
      </div>
    </header>

    {mobile&&<div className="mobile-panel">{nav.map(([id,name,Icon])=><button key={id} onClick={()=>go(id)}><Icon size={18}/>{name}</button>)}</div>}

    {!isSupabaseConfigured&&<div className="setup-banner"><AlertCircle size={17}/>{t("الموقع في وضع الإعداد: أضف بيانات Supabase في ملف .env لإتاحة الحسابات والملفات ورفع المحتوى.","Configuration requise : ajoutez les identifiants Supabase dans .env pour activer les comptes, les fichiers et l'administration.")}</div>}

    <main>
      {page==="home"&&<><section className="hero">
        <div className="hero-glow glow-one"></div><div className="hero-glow glow-two"></div>
        <div className="hero-content"><div className="eyebrow"><span className="pulse"></span>{t("منصة تعليمية مغربية","Plateforme éducative marocaine")}</div>
          <h1>{t("طريقك نحو","Votre chemin vers")}<br/><em>{t("النجاح يبدأ هنا","la réussite commence ici")}</em></h1>
          <p>{t("كل ما تحتاجه للتفوق الدراسي: دروس، ملخصات، تمارين وامتحانات، ومساعد ذكي يشرح لك خطوة بخطوة.","Tout pour réussir : cours, résumés, exercices, examens et un assistant intelligent qui vous accompagne.")}</p>
          <div className="hero-actions"><button className="primary-btn" onClick={()=>go("library")}>{t("اكتشف المكتبة","Explorer la bibliothèque")}<ArrowLeft size={18}/></button><button className="ghost-btn" onClick={()=>go("ai")}><Sparkles size={17}/> NAJA7 AI</button></div>
          <div className="hero-proof"><span><ShieldCheck size={16}/>{t("محتوى منظم حسب المنهاج","Contenu organisé par niveau")}</span><span><Clock3 size={16}/>{t("متاح في أي وقت","Disponible à tout moment")}</span></div>
        </div>
        <div className="hero-art"><div className="orbit orbit-a"></div><div className="orbit orbit-b"></div><div className="hero-book"><div className="book-top"><span>NAJA7</span><GraduationCap size={35}/></div><div className="book-lines"><i></i><i></i><i></i></div><div className="book-label">{t("تعلم • تدرب • تفوق","Apprendre • Pratiquer • Réussir")}</div></div><div className="float-card float-pdf"><FileText size={19}/><span><b>PDF</b><small>{t("مكتبة منظمة","Bibliothèque")}</small></span></div><div className="float-card float-ai"><Bot size={20}/><span><b>NAJA7 AI</b><small>{t("مساعدك الدراسي","Assistant scolaire")}</small></span></div><div className="spark s1">✦</div><div className="spark s2">✧</div></div>
      </section>
      <section className="search-wrap"><div className="search-box"><Search size={22}/><input value={query} onChange={e=>{setQuery(e.target.value);if(e.target.value)go("library")}} placeholder={t("ابحث عن درس، مادة أو امتحان...","Rechercher un cours, une matière ou un examen...")}/><button onClick={()=>go("library")}>{t("بحث","Rechercher")}</button></div><div className="search-hint">{t("جرّب: الرياضيات، الفيزياء، الامتحان الوطني...","Essayez : maths, physique, examen national...")}</div></section>
      <section className="section-block"><div className="section-heading"><div><span className="kicker">{t("مسارك الدراسي","VOTRE PARCOURS")}</span><h2>{t("اختر مستواك الدراسي","Choisissez votre niveau")}</h2><p>{t("محتوى مرتب ليساعدك على التقدم خطوة بخطوة.","Des ressources organisées pour progresser étape par étape.")}</p></div><button className="text-link" onClick={()=>go("library")}>{t("كل المستويات","Tous les niveaux")}<ChevronLeft size={17}/></button></div>
        <div className="level-grid">{LEVELS.map((x,i)=><button className="level-card" key={x.id} onClick={()=>{setLevel(x.id);go("library")}}><span className={`level-icon tone-${i%4}`}><GraduationCap size={22}/></span><span><b>{txt(x,lang,"ar","fr")}</b><small>{x.track==="collège"?t("السلك الإعدادي","Collège"):t("الثانوي التأهيلي","Lycée")}</small></span><ArrowLeft size={17} className="level-arrow"/></button>)}</div>
      </section>
      <section className="section-block"><div className="section-heading"><div><span className="kicker">{t("تعلم بتركيز","APPRENDRE")}</span><h2>{t("المواد الدراسية","Matières scolaires")}</h2><p>{t("اختر المادة للوصول إلى مواردها.","Choisissez une matière pour voir ses ressources.")}</p></div></div><div className="subject-grid">{SUBJECTS.slice(0,8).map((s,i)=><button className="subject-card" key={s.id} onClick={()=>{setSubject(s.id);go("library")}}><span className={`subject-symbol sym-${i%4}`}>{["∑","⚛","⌬","أ","A","文","☾","⌖"][i]}</span><b>{txt(s,lang,"ar","fr")}</b><small>{t("استكشف الموارد","Voir les ressources")} <ChevronLeft size={13}/></small></button>)}</div></section>
      <section className="ai-banner"><div className="ai-orb"><Bot size={42}/><span></span></div><div><span className="kicker">{t("رفيقك في التعلم","VOTRE COMPAGNON")}</span><h2>NAJA7 AI</h2><p>{t("اسأل، افهم، وتدرّب. مساعدك الذكي يشرح المفاهيم ويقترح خطوات للحل بطريقة مبسطة.","Posez vos questions, comprenez et entraînez-vous avec un assistant pédagogique.")}</p></div><button className="primary-btn" onClick={()=>go("ai")}>{t("ابدأ المحادثة","Commencer")}<ArrowLeft size={18}/></button></section>
      <section className="section-block"><div className="section-heading"><div><span className="kicker">{t("محتوى جديد","RÉCEMMENT AJOUTÉ")}</span><h2>{t("أحدث الموارد","Dernières ressources")}</h2></div><button className="text-link" onClick={()=>go("library")}>{t("عرض الكل","Tout voir")}<ChevronLeft size={17}/></button></div><ResourceGrid items={items.slice(0,4)} onOpen={openResource} onFav={toggleFavorite} favorites={favorites} lang={lang} isAdmin={isAdmin} onDelete={deleteResource} labelLevel={labelLevel} labelSubject={labelSubject} labelType={labelType} t={t}/></section>
      </>}

      {(page==="library"||page==="exams"||page==="favorites")&&<section className="content-page">
        <div className="page-intro"><div><span className="kicker">{page==="exams"?t("استعد للامتحان","PRÉPARATION"):page==="favorites"?t("مواردك المحفوظة","VOS FAVORIS"):t("مكتبة المعرفة","BIBLIOTHÈQUE")}</span><h1>{page==="exams"?t("الامتحانات الجهوية والوطنية", "Examens régionaux et nationaux"):page==="favorites"?t("المفضلة","Favoris"):t("مكتبة الدروس PDF","Bibliothèque PDF")}</h1><p>{t("ابحث وصنّف الموارد حسب المستوى والمادة والنوع.","Recherchez et filtrez par niveau, matière et type.")}</p></div>{isAdmin&&<button className="primary-btn" onClick={()=>setShowUpload(true)}><UploadCloud size={17}/>{t("إضافة PDF","Ajouter un PDF")}</button>}</div>
        <div className="filter-panel"><div className="filter-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t("ابحث في الموارد...","Rechercher...")}/></div><div className="filter-row"><label><span>{t("المستوى","Niveau")}</span><select value={level} onChange={e=>setLevel(e.target.value)}><option value="all">{t("جميع المستويات","Tous les niveaux")}</option>{LEVELS.map(x=><option value={x.id} key={x.id}>{txt(x,lang)}</option>)}</select></label><label><span>{t("المادة","Matière")}</span><select value={subject} onChange={e=>setSubject(e.target.value)}><option value="all">{t("جميع المواد","Toutes")}</option>{SUBJECTS.map(x=><option value={x.id} key={x.id}>{txt(x,lang)}</option>)}</select></label><label><span>{t("النوع","Type")}</span><select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">{t("جميع الأنواع","Tous")}</option>{TYPES.filter(x=>page!=="exams"||["regional","national"].includes(x.id)).map(x=><option value={x.id} key={x.id}>{txt(x,lang)}</option>)}</select></label></div></div>
        <div className="results-head"><span>{filtered.length} {t("مورد","ressources")}</span><span><Filter size={14}/>{t("نتائج مطابقة","Résultats correspondants")}</span></div>
        {loading?<div className="empty-state"><div className="loader"></div>{t("جاري تحميل الموارد...","Chargement...")}</div>:<ResourceGrid items={filtered} onOpen={openResource} onFav={toggleFavorite} favorites={favorites} lang={lang} isAdmin={isAdmin} onDelete={deleteResource} labelLevel={labelLevel} labelSubject={labelSubject} labelType={labelType} t={t}/>}
      </section>)}

      {page==="ai"&&<section className="ai-page"><div className="ai-page-head"><div className="ai-avatar"><Bot size={28}/></div><div><span className="kicker">VOTRE ASSISTANT PÉDAGOGIQUE</span><h1>NAJA7 AI</h1><p>{t("مساعدك الذكي لفهم دروس المنهاج المغربي.","Votre assistant intelligent pour le programme marocain.")}</p></div><span className="online-dot">{t("متصل","En ligne")}</span></div>
        <div className="ai-context"><label>{t("المستوى الدراسي","Niveau")}<select value={aiLevel} onChange={e=>setAiLevel(e.target.value)}>{LEVELS.map(x=><option value={x.id} key={x.id}>{txt(x,lang)}</option>)}</select></label><label>{t("المادة","Matière")}<select value={aiSubject} onChange={e=>setAiSubject(e.target.value)}>{SUBJECTS.map(x=><option value={x.id} key={x.id}>{txt(x,lang)}</option>)}</select></label></div>
        <div className="chat-window">{chat.length===0?<div className="chat-welcome"><div className="welcome-spark"><Sparkles size={25}/></div><h2>{t("مرحبا بك في NAJA7 AI","Bienvenue sur NAJA7 AI")}</h2><p>{t("شنو بغيتي تفهم اليوم؟ نقدر نشرح ليك الدرس، نعاونك في تمرين، أو نوجد ليك أسئلة للتدرب.","Que souhaitez-vous apprendre aujourd'hui ? Je peux expliquer un cours, vous aider avec un exercice ou créer des questions.")}</p><div className="prompt-chips">{[t("شرح درس الاشتقاق","Expliquer la dérivation"),t("تمارين في الكهرباء","Exercices d'électricité"),t("لخص لي درساً","Résumer un cours")].map(x=><button key={x} onClick={()=>setPrompt(x)}>{x}<ArrowLeft size={14}/></button>)}</div></div>:chat.map((m,i)=><div className={`chat-message ${m.role}`} key={i}><span className="message-avatar">{m.role==="assistant"?<Bot size={17}/>:<GraduationCap size={17}/>}</span><div className="message-body"><b>{m.role==="assistant"?"NAJA7 AI":t("أنت","Vous")}</b><p>{m.content}</p></div></div>)}{aiBusy&&<div className="typing"><i></i><i></i><i></i>{t("يفكر...","Réflexion...")}</div>}</div>
        <form className="chat-composer" onSubmit={sendAI}><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={t("اكتب سؤالك الدراسي هنا...","Écrivez votre question ici...")} rows="2"/><div className="composer-bottom"><span><ShieldCheck size={14}/>{t("استعمله للفهم والتعلم","Pour apprendre et comprendre")}</span><button className="send-btn" disabled={!prompt.trim()||aiBusy}><Send size={18}/></button></div></form><p className="ai-disclaimer">{t("قد يخطئ الذكاء الاصطناعي؛ راجع دائماً المراجع والدروس الرسمية.","L'IA peut se tromper. Vérifiez les informations avec vos cours et sources officielles.")}</p>
      </section>}

      {page==="admin"&&<section className="content-page"><div className="page-intro"><div><span className="kicker">ESPACE ADMINISTRATEUR</span><h1>{t("لوحة التحكم","Tableau de bord")}</h1><p>{t("إدارة الموارد التعليمية المنشورة على المنصة.","Gérez les ressources de la plateforme.")}</p></div><button className="primary-btn" onClick={()=>setShowUpload(true)}><UploadCloud size={17}/>{t("رفع ملف PDF","Téléverser PDF")}</button></div>{!isAdmin?<div className="empty-state"><ShieldCheck size={35}/><h3>{t("غير مصرح لك بالدخول","Accès non autorisé")}</h3><p>{t("يجب أن يكون حسابك بصلاحية admin في قاعدة البيانات.","Votre compte doit avoir le rôle admin dans la base.")}</p></div>:<><div className="admin-stats"><div><FileText/><b>{items.length}</b><span>{t("الموارد المنشورة","Ressources")}</span></div><div><Bookmark/><b>{favorites.length}</b><span>{t("مفضلات هذا الحساب","Favoris de ce compte")}</span></div><div><ShieldCheck/><b>RLS</b><span>{t("حماية قاعدة البيانات","Sécurité base de données")}</span></div></div><ResourceGrid items={items} onOpen={openResource} onFav={toggleFavorite} favorites={favorites} lang={lang} isAdmin={isAdmin} onDelete={deleteResource} labelLevel={labelLevel} labelSubject={labelSubject} labelType={labelType} t={t}/></>}</section>}
    </main>

    <footer className="footer"><div className="footer-main"><div className="footer-brand"><div className="brand-mark"><GraduationCap size={24}/></div><b>NAJA7</b><p>{t("طريقك نحو النجاح. منصة تعليمية تساعد التلميذ المغربي على التعلم والتفوق.","Votre chemin vers la réussite. Une plateforme pour apprendre et progresser.")}</p></div><div><b>{t("استكشف","Explorer")}</b><button onClick={()=>go("library")}>{t("مكتبة PDF","Bibliothèque PDF")}</button><button onClick={()=>go("exams")}>{t("الامتحانات","Examens")}</button><button onClick={()=>go("ai")}>NAJA7 AI</button></div><div><b>{t("المستويات","Niveaux")}</b>{LEVELS.slice(0,4).map(x=><button key={x.id} onClick={()=>{setLevel(x.id);go("library")}}>{txt(x,lang)}</button>)}</div><div><b>{t("معلومات","Informations")}</b><button>{t("سياسة الخصوصية","Confidentialité")}</button><button>{t("تواصل معنا","Contact")}</button><button>{t("حول المنصة","À propos")}</button></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} NAJA7. {t("جميع الحقوق محفوظة.","Tous droits réservés.")}</span><span>{t("صنع لمرافقة رحلتك الدراسية","Conçu pour accompagner votre parcours")}</span></div></footer>

    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="pdf-modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><b>{selected.title}</b><small>{labelLevel(selected.level)} · {labelSubject(selected.subject)}</small></div><button className="icon-btn" onClick={()=>setSelected(null)}><X/></button></div>{selected.signedUrl?<iframe title={selected.title} src={selected.signedUrl} className="pdf-frame"/>:<div className="empty-state"><div className="loader"/>{t("جاري تجهيز الملف...","Préparation du fichier...")}</div>}<div className="modal-foot"><span>{fmtSize(selected.file_size)}</span>{selected.signedUrl&&<a className="primary-btn" href={selected.signedUrl} target="_blank" rel="noreferrer" download><Download size={16}/>{t("تحميل PDF","Télécharger PDF")}</a>}</div></div></div>}

    {showAuth&&<div className="modal-backdrop" onClick={()=>setShowAuth(false)}><div className="auth-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowAuth(false)}><X/></button><div className="auth-logo"><GraduationCap size={26}/></div><h2>{authMode==="signup"?t("إنشاء حساب جديد","Créer un compte"):t("مرحباً بعودتك","Bon retour")}</h2><p>{t("احفظ مواردك وتابع تقدمك الدراسي.","Enregistrez vos ressources et suivez vos progrès.")}</p><form onSubmit={authSubmit}>{authMode==="signup"&&<input required value={authName} onChange={e=>setAuthName(e.target.value)} placeholder={t("الاسم","Nom")}/>}<input required type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="Email"/><input required minLength="8" type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder={t("كلمة المرور (8 أحرف على الأقل)","Mot de passe (8 caractères minimum)")}/><button className="primary-btn block-btn">{authMode==="signup"?t("إنشاء الحساب","Créer le compte"):t("تسجيل الدخول","Se connecter")}</button></form><button className="switch-auth" onClick={()=>setAuthMode(v=>v==="signup"?"signin":"signup")}>{authMode==="signup"?t("لديك حساب؟ سجل الدخول","Déjà inscrit ? Connexion"):t("ليس لديك حساب؟ أنشئ حساباً","Pas de compte ? Inscription")}</button></div></div>}

    {showUpload&&<div className="modal-backdrop" onClick={()=>setShowUpload(false)}><div className="upload-modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><b>{t("إضافة مورد تعليمي","Ajouter une ressource")}</b><small>{t("ارفع ملف PDF وأضف بياناته","Téléversez un PDF et renseignez ses informations")}</small></div><button className="icon-btn" onClick={()=>setShowUpload(false)}><X/></button></div><form onSubmit={uploadSubmit} className="upload-form"><label>{t("عنوان الملف","Titre")}<input required value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)}/></label><label>{t("وصف مختصر","Description")}<textarea value={uploadDesc} onChange={e=>setUploadDesc(e.target.value)} rows="2"/></label><div className="two-fields"><label>{t("المستوى","Niveau")}<select value={uploadLevel} onChange={e=>setUploadLevel(e.target.value)}>{LEVELS.map(x=><option key={x.id} value={x.id}>{txt(x,lang)}</option>)}</select></label><label>{t("المادة","Matière")}<select value={uploadSubject} onChange={e=>setUploadSubject(e.target.value)}>{SUBJECTS.map(x=><option key={x.id} value={x.id}>{txt(x,lang)}</option>)}</select></label></div><div className="two-fields"><label>{t("نوع المورد","Type")}<select value={uploadType} onChange={e=>setUploadType(e.target.value)}>{TYPES.map(x=><option key={x.id} value={x.id}>{txt(x,lang)}</option>)}</select></label><label>{t("السنة","Année")}<input type="number" value={uploadYear} onChange={e=>setUploadYear(e.target.value)}/></label></div>{["regional","national"].includes(uploadType)&&<label>{t("المسلك / الشعبة","Filière")}<input value={uploadTrack} onChange={e=>setUploadTrack(e.target.value)} placeholder={t("مثال: علوم فيزيائية","Ex. Sciences physiques")}/></label>}<label className="file-drop"><UploadCloud size={24}/><b>{uploadFile?uploadFile.name:t("اختر ملف PDF","Choisir un fichier PDF")}</b><small>{t("PDF فقط · 25MB كحد أقصى","PDF uniquement · 25 Mo max")}</small><input required type="file" accept="application/pdf,.pdf" onChange={e=>setUploadFile(e.target.files?.[0]||null)}/></label><button disabled={uploadBusy} className="primary-btn block-btn">{uploadBusy?t("جاري الرفع...","Téléversement..."):t("نشر المورد","Publier")}</button></form></div></div>}

    {toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>
}

function ResourceGrid({items,onOpen,onFav,favorites,lang,isAdmin,onDelete,labelLevel,labelSubject,labelType,t}){
  if(!items.length)return <div className="empty-state"><div className="empty-icon"><Library size={27}/></div><h3>{t("لا توجد موارد منشورة حالياً","Aucune ressource publiée pour le moment")}</h3><p>{t("سيتم عرض الملفات الحقيقية هنا بمجرد إضافتها من لوحة الإدارة.","Les fichiers apparaîtront ici dès qu'ils seront ajoutés depuis l'administration.")}</p></div>;
  return <div className="resource-grid">{items.map(x=><article className="resource-card" key={x.id}><div className="resource-cover"><div className="pdf-icon"><FileText size={29}/><b>PDF</b></div><span className="resource-type">{labelType(x.kind)}</span><button className="fav-btn" onClick={()=>onFav(x.id)} title={t("المفضلة","Favori")}>{favorites.includes(x.id)?<BookmarkCheck size={18}/>:<Bookmark size={18}/>}</button></div><div className="resource-info"><div className="resource-tags"><span>{labelLevel(x.level)}</span><span>{labelSubject(x.subject)}</span></div><h3>{x.title}</h3><p>{x.description||t("ملف تعليمي بصيغة PDF.","Document pédagogique PDF.")}</p><div className="resource-meta"><span><FileText size={13}/>{x.file_size?`${(x.file_size/1024/1024).toFixed(1)} MB`:"PDF"}</span><span><Clock3 size={13}/>{niceDate(x.created_at)}</span></div><div className="resource-actions"><button className="open-resource" onClick={()=>onOpen(x)}><Eye size={15}/>{t("عرض الملف","Consulter")}</button>{isAdmin&&<button className="delete-resource" onClick={()=>onDelete(x)}><Trash2 size={15}/></button>}</div></div></article>)}</div>
}

export default App;