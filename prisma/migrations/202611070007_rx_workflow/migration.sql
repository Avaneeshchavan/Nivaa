-- CreateEnum
CREATE TYPE "AdviceLanguage" AS ENUM ('EN', 'MR', 'HI');

-- AlterEnum
ALTER TYPE "MedicineFood" ADD VALUE 'EMPTY';

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "followUpDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DoctorMedicinePref" ADD COLUMN     "defaultDoseUnit" TEXT;

-- CreateTable
CREATE TABLE "AdviceSnippet" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "language" "AdviceLanguage" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdviceSnippet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplatePreference" (
    "doctorId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "TemplatePreference_pkey" PRIMARY KEY ("doctorId","templateId")
);

-- CreateIndex
CREATE INDEX "AdviceSnippet_doctorId_language_idx" ON "AdviceSnippet"("doctorId", "language");

-- AddForeignKey
ALTER TABLE "AdviceSnippet" ADD CONSTRAINT "AdviceSnippet_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplatePreference" ADD CONSTRAINT "TemplatePreference_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplatePreference" ADD CONSTRAINT "TemplatePreference_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DiseaseTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- New workflow tables follow the existing server-only access pattern.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['AdviceSnippet','TemplatePreference'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',t);
  EXECUTE format('CREATE POLICY server_only ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',t);
 END LOOP;
END $$;

-- Seed reviewable starter advice once for existing doctors. Later deletion is respected.
INSERT INTO "AdviceSnippet" (id,"doctorId",language,text,"updatedAt")
SELECT 'advice_'||md5(d.id||':'||s.language||':'||s.position),d.id,s.language::"AdviceLanguage",s.text,now()
FROM "Doctor" d CROSS JOIN (VALUES (0,'EN','Follow the instructions given by your doctor.'),
(0,'MR','डॉक्टरांनी दिलेल्या सूचनांचे पालन करा.'),
(0,'HI','डॉक्टर द्वारा दिए गए निर्देशों का पालन करें।'),
(1,'EN','Bring previous prescriptions to your next visit.'),
(1,'MR','पुढील भेटीत आधीची प्रिस्क्रिप्शने आणा.'),
(1,'HI','अगली मुलाकात में पुराने पर्चे साथ लाएँ।'),
(2,'EN','Do not change the dose without speaking to your doctor.'),
(2,'MR','डॉक्टरांशी बोलल्याशिवाय औषधाचा डोस बदलू नका.'),
(2,'HI','डॉक्टर से पूछे बिना दवा की खुराक न बदलें।'),
(3,'EN','Bring your test reports to the follow-up visit.'),
(3,'MR','पुढील तपासणीच्या वेळी चाचण्यांचे अहवाल आणा.'),
(3,'HI','अगली जाँच के समय अपनी रिपोर्ट साथ लाएँ।'),
(4,'EN','Keep a record of your symptoms.'),
(4,'MR','आपल्या लक्षणांची नोंद ठेवा.'),
(4,'HI','अपने लक्षणों का रिकॉर्ड रखें।'),
(5,'EN','Use clean drinking water.'),
(5,'MR','पिण्यासाठी स्वच्छ पाणी वापरा.'),
(5,'HI','पीने के लिए साफ पानी का उपयोग करें।'),
(6,'EN','Wash your hands before meals.'),
(6,'MR','जेवणापूर्वी हात धुवा.'),
(6,'HI','खाने से पहले हाथ धोएँ।'),
(7,'EN','Avoid smoking.'),
(7,'MR','धूम्रपान टाळा.'),
(7,'HI','धूम्रपान से बचें।'),
(8,'EN','Avoid tobacco.'),
(8,'MR','तंबाखू टाळा.'),
(8,'HI','तंबाकू से बचें।'),
(9,'EN','Discuss alcohol use with your doctor.'),
(9,'MR','मद्यपानाबद्दल आपल्या डॉक्टरांशी चर्चा करा.'),
(9,'HI','शराब के सेवन के बारे में अपने डॉक्टर से बात करें।'),
(10,'EN','Follow the diet advised by your doctor.'),
(10,'MR','डॉक्टरांनी सांगितलेल्या आहाराचे पालन करा.'),
(10,'HI','डॉक्टर द्वारा बताए गए आहार का पालन करें।'),
(11,'EN','Follow the activity advice given by your doctor.'),
(11,'MR','शारीरिक हालचालींबाबत डॉक्टरांच्या सूचनांचे पालन करा.'),
(11,'HI','शारीरिक गतिविधि के बारे में डॉक्टर की सलाह का पालन करें।'),
(12,'EN','Ask the doctor about any instruction you do not understand.'),
(12,'MR','न समजलेल्या सूचनेबद्दल डॉक्टरांना विचारा.'),
(12,'HI','जो निर्देश समझ न आए, उसके बारे में डॉक्टर से पूछें।'),
(13,'EN','Contact the clinic if your symptoms worsen.'),
(13,'MR','लक्षणे वाढल्यास दवाखान्याशी संपर्क साधा.'),
(13,'HI','लक्षण बढ़ने पर क्लिनिक से संपर्क करें।'),
(14,'EN','Seek urgent medical care for severe or rapidly worsening symptoms.'),
(14,'MR','तीव्र किंवा झपाट्याने वाढणाऱ्या लक्षणांसाठी तातडीची वैद्यकीय मदत घ्या.'),
(14,'HI','गंभीर या तेजी से बढ़ते लक्षणों में तुरंत चिकित्सा सहायता लें।'),
(15,'EN','Do not share your medicines with others.'),
(15,'MR','आपली औषधे इतरांना देऊ नका.'),
(15,'HI','अपनी दवाएँ दूसरों को न दें।'),
(16,'EN','Tell your doctor about any allergies.'),
(16,'MR','कोणतीही ॲलर्जी असल्यास डॉक्टरांना सांगा.'),
(16,'HI','किसी भी एलर्जी के बारे में डॉक्टर को बताएँ।'),
(17,'EN','Tell your doctor about all medicines and supplements you take.'),
(17,'MR','आपण घेत असलेल्या सर्व औषधांची आणि पूरक पदार्थांची माहिती डॉक्टरांना द्या.'),
(17,'HI','अपनी सभी दवाओं और सप्लीमेंट के बारे में डॉक्टर को बताएँ।'),
(18,'EN','Attend your follow-up as advised.'),
(18,'MR','सांगितल्याप्रमाणे पुढील तपासणीसाठी या.'),
(18,'HI','बताए गए समय पर दोबारा जाँच के लिए आएँ।'),
(19,'EN','Keep this prescription for future visits.'),
(19,'MR','पुढील भेटींसाठी हे प्रिस्क्रिप्शन जपून ठेवा.'),
(19,'HI','अगली मुलाकातों के लिए यह पर्चा संभालकर रखें।')) s(position,language,text)
ON CONFLICT DO NOTHING;
