# NAJA7 – منصة النجاح التعليمية المغربية

نسخة تأسيسية قابلة للتشغيل لمنصة NAJA7، مبنية بـ React + Vite + Supabase.

## ما الذي يعمل في هذه النسخة؟
- واجهة عربية/فرنسية مع RTL/LTR.
- تصميم متجاوب مع الهاتف والحاسوب، ووضع داكن/فاتح.
- عرض المستويات الستة والمواد.
- مكتبة موارد مرتبطة بقاعدة البيانات مع البحث والتصفية.
- عارض PDF داخل الموقع وروابط تحميل مؤقتة آمنة.
- تسجيل حساب وتسجيل الدخول.
- مفضلة المستخدم.
- رفع PDF وإدارة الحذف من حساب admin.
- نقطة اتصال NAJA7 AI على Supabase Edge Function؛ مفتاح المزود يبقى على الخادم.

لا توجد ملفات دروس أو امتحانات جاهزة في المشروع، حتى لا نعرض روابط أو ملفات وهمية. ستظهر الموارد بعد رفع ملفات حقيقية من حساب المدير.

## 1) تشغيل المشروع محلياً
يتطلب Node.js حديثاً:
```bash
npm install
cp .env.example .env
npm run dev
```
افتح العنوان الذي يعرضه Vite.

## 2) إعداد Supabase
1. أنشئ مشروعاً في Supabase.
2. من Project Settings > API انسخ Project URL وPublishable key (أو anon public key).
3. ضعهما في `.env`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_KEY
```
4. من SQL Editor نفّذ الملف `supabase/migrations/001_naja7_schema.sql`.
5. أنشئ حسابك من الموقع.
6. في SQL Editor نفّذ ترقية حسابك إلى admin بعد استبدال البريد:
```sql
update public.profiles
set role='admin'
where id=(select id from auth.users where email='YOUR_EMAIL');
```
لا تضع `service_role` أو مفاتيح سرية في `.env` الذي يبدأ بـ `VITE_` أو في كود المتصفح.

## 3) إعداد NAJA7 AI
تحتاج مفتاح API من مزود النموذج. لا تضعه في React أو في متغير VITE.
من مجلد المشروع وبعد تثبيت Supabase CLI وربط المشروع:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set OPENAI_API_KEY=YOUR_SECRET_KEY
supabase functions deploy naja7-ai
```
الدالة تتحقق من جلسة Supabase وتستدعي OpenAI من الخادم. راجع حدود الاستخدام والفوترة لدى مزود API قبل فتح الخدمة للجمهور.

## 4) إضافة المحتوى
- سجل الدخول بحساب admin.
- افتح مكتبة PDF أو لوحة التحكم.
- اضغط «إضافة PDF»، أدخل العنوان والوصف والمستوى والمادة والنوع والسنة، ثم اختر ملف PDF.
- الملفات تحفظ في bucket خاص `study-pdfs`، ويُنشأ رابط مؤقت للعرض عند الطلب.
- الامتحانات الجهوية والوطنية يمكن تصنيفها بالنوع، السنة، والمسلك.

## 5) النشر
يمكن نشر واجهة Vite على Netlify أو Vercel:
- Build command: `npm run build`
- Publish directory: `dist`
- أضف متغيري البيئة `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY` في إعدادات الاستضافة.
- انشر Supabase Edge Function بشكل مستقل كما في القسم السابق.

## ملاحظات أمنية مهمة
- RLS مفعّل على الجداول.
- صلاحية admin تُمنح من SQL فقط، ولا يمكن للمستخدم ترقيتها من الواجهة.
- ملفات PDF في bucket خاص ولا توجد روابط عامة دائمة.
- يجب تفعيل تأكيد البريد، إعداد سياسة كلمات المرور، وضبط الحماية من إساءة الاستخدام قبل الإطلاق العام.
- لا تحفظ المحادثات في هذه النسخة بعد تحديث الصفحة؛ إضافة سجل محادثات دائم تحتاج جدولاً وسياسات خصوصية إضافية.
- إحصائيات الزوار، فلترة الجهة بالتفصيل، وتحرير/تحديث الموارد من الواجهة هي مراحل تالية وليست مفعّلة بعد.
