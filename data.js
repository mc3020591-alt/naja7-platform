export const LEVELS = [
  { id:"1ac", ar:"الأولى إعدادي", fr:"1ère année collège", track:"collège" },
  { id:"2ac", ar:"الثانية إعدادي", fr:"2ème année collège", track:"collège" },
  { id:"3ac", ar:"الثالثة إعدادي", fr:"3ème année collège", track:"collège" },
  { id:"tc", ar:"الجذع المشترك", fr:"Tronc commun", track:"lycée" },
  { id:"1bac", ar:"الأولى باكالوريا", fr:"1ère année bac", track:"lycée" },
  { id:"2bac", ar:"الثانية باكالوريا", fr:"2ème année bac", track:"lycée" }
];
export const SUBJECTS = [
  ["math","الرياضيات","Mathématiques"],["physique","الفيزياء والكيمياء","Physique-Chimie"],
  ["svt","علوم الحياة والأرض","SVT"],["arabe","اللغة العربية","Arabe"],
  ["francais","اللغة الفرنسية","Français"],["anglais","اللغة الإنجليزية","Anglais"],
  ["islamique","التربية الإسلامية","Éducation islamique"],["histoire","الاجتماعيات","Histoire-Géo"],
  ["philosophie","الفلسفة","Philosophie"],["informatique","المعلوميات","Informatique"]
].map(([id,ar,fr])=>({id,ar,fr}));
export const TYPES = [
  {id:"lesson",ar:"درس",fr:"Cours"},{id:"summary",ar:"ملخص",fr:"Résumé"},
  {id:"exercise",ar:"تمرين",fr:"Exercice"},{id:"exam",ar:"فرض",fr:"Contrôle"},
  {id:"regional",ar:"امتحان جهوي",fr:"Examen régional"},
  {id:"national",ar:"امتحان وطني",fr:"Examen national"}
];