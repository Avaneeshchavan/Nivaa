export interface RxMedicine {
  id: string
  name: string
  generic?: string | null
  form?: string | null
  dosage: string
  frequency: string
  duration: string
  instructions?: string | null
}

export interface DefaultTemplate {
  name: string
  diagnosis: string
  medicines: RxMedicine[]
  notes?: string
}

export const defaultTemplates: DefaultTemplate[] = [
  {
    name: "Hypertension (HTN) Initial",
    diagnosis: "Essential Hypertension",
    medicines: [
      {
        id: "default-htn-1",
        name: "Amlodipine 5mg",
        generic: "Amlodipine Besylate",
        form: "Tablet",
        dosage: "1 tab",
        frequency: "Once daily (OD) - Morning",
        duration: "30 Days",
        instructions: "Take after breakfast. Monitor BP weekly."
      },
      {
        id: "default-htn-2",
        name: "Telmisartan 40mg",
        generic: "Telmisartan",
        form: "Tablet",
        dosage: "1 tab",
        frequency: "Once daily (OD) - Night",
        duration: "30 Days",
        instructions: "Take before bedtime. Avoid salt-heavy food."
      }
    ],
    notes: "Review blood pressure in 2 weeks. Advise low sodium diet, regular moderate exercise."
  },
  {
    name: "Type 2 Diabetes Mellitus (T2DM)",
    diagnosis: "Type 2 Diabetes Mellitus",
    medicines: [
      {
        id: "default-t2dm-1",
        name: "Metformin 500mg ER",
        generic: "Metformin Hydrochloride",
        form: "Tablet",
        dosage: "1 tab",
        frequency: "Twice daily (BD)",
        duration: "30 Days",
        instructions: "Take with breakfast and dinner. Do not crush."
      },
      {
        id: "default-t2dm-2",
        name: "Glimepiride 2mg",
        generic: "Glimepiride",
        form: "Tablet",
        dosage: "1 tab",
        frequency: "Once daily (OD) - Morning",
        duration: "30 Days",
        instructions: "Take 15 minutes before breakfast. Guard against hypoglycemia."
      }
    ],
    notes: "Check HbA1c and fasting blood sugar regularly. Lifestyle modification: cut down simple carbs, walk 30 mins daily."
  },
  {
    name: "Upper Respiratory Tract Infection (URTI)",
    diagnosis: "Acute Upper Respiratory Tract Infection",
    medicines: [
      {
        id: "default-urti-1",
        name: "Paracetamol 650mg",
        generic: "Acetaminophen",
        form: "Tablet",
        dosage: "1 tab",
        frequency: "Three times daily (TDS)",
        duration: "5 Days",
        instructions: "Take only if fever or body ache exceeds 100°F (SOS)."
      },
      {
        id: "default-urti-2",
        name: "Amoxicillin-Clavulanate 625mg",
        generic: "Amoxicillin + Clavulanic Acid",
        form: "Tablet",
        dosage: "1 tab",
        frequency: "Twice daily (BD)",
        duration: "5 Days",
        instructions: "Complete the full 5-day course even if feeling better. Take after meals."
      },
      {
        id: "default-urti-3",
        name: "Cetirizine 10mg",
        generic: "Cetirizine Hydrochloride",
        form: "Tablet",
        dosage: "1 tab",
        frequency: "Once daily (OD) - Night",
        duration: "5 Days",
        instructions: "May cause mild drowsiness. Take before bedtime."
      }
    ],
    notes: "Warm saline gargles 3-4 times a day. Hydrate well and rest."
  },
  {
    name: "Acute Gastritis",
    diagnosis: "Acute Gastritis / Dyspepsia",
    medicines: [
      {
        id: "default-gastritis-1",
        name: "Pantoprazole 40mg",
        generic: "Pantoprazole",
        form: "Tablet",
        dosage: "1 tab",
        frequency: "Once daily (OD) - Morning",
        duration: "14 Days",
        instructions: "Take on an empty stomach, 30 minutes before breakfast."
      },
      {
        id: "default-gastritis-2",
        name: "Domperidone 10mg",
        generic: "Domperidone",
        form: "Tablet",
        dosage: "1 tab",
        frequency: "Three times daily (TDS)",
        duration: "7 Days",
        instructions: "Take 15 minutes before meals."
      }
    ],
    notes: "Avoid spicy, oily, acidic foods. Small, frequent meals recommended. Avoid lying down immediately after meals."
  },
  {
    name: "Urinary Tract Infection (UTI)",
    diagnosis: "Acute Cystitis / Urinary Tract Infection",
    medicines: [
      {
        id: "default-uti-1",
        name: "Nitrofurantoin 100mg",
        generic: "Nitrofurantoin Monohydrate",
        form: "Tablet",
        dosage: "1 tab",
        frequency: "Twice daily (BD)",
        duration: "7 Days",
        instructions: "Take with food to increase absorption and decrease side effects."
      },
      {
        id: "default-uti-2",
        name: "Phenazopyridine 200mg",
        generic: "Phenazopyridine Hydrochloride",
        form: "Tablet",
        dosage: "1 tab",
        frequency: "Three times daily (TDS)",
        duration: "3 Days",
        instructions: "Take after meals. Will turn urine orange-red (normal side effect)."
      }
    ],
    notes: "Drink plenty of water (2.5 to 3 liters daily). Do not hold urine. Complete the antibiotic course."
  }
]
