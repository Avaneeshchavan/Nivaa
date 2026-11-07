import { medicineInstructions } from '@/lib/rx/dose'
/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet, Image, Font, Svg, Path } from '@react-pdf/renderer'
import { formatVisitMeasurements, type VisitMeasurements } from '@/lib/validations/visit.schema'
import { Doctor, Patient, Prescription } from '@/lib/generated/prisma/client'

import { parseHandwriting, strokePath } from '@/lib/validations/handwriting.schema'
import fontSource from '@/lib/pdf-font.json'
Font.register({ family: 'Nivaa', src: fontSource })

// Define medicine shape stored in Prescription.medicines JSON
interface RxMedicine {
  id: string
  name: string
  generic?: string | null
  form?: string | null
  dosage: string
  frequency: string
  duration: string
  food?: import('@/lib/rx/dose').Food
  quantity?: number | null
  doseUnit?: string
  instructions?: string | null
}

const styles = StyleSheet.create({
  page: { padding: 30, paddingBottom: 110, fontFamily: ['Helvetica', 'Nivaa'], fontSize: 10, color: '#333' },
  watermark: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    width: '80%',
    opacity: 0.05,
    transform: 'rotate(-45deg)',
    fontSize: 60,
    color: '#000',
    textAlign: 'center',
    zIndex: -1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottom: '2pt solid #1a4f8a', paddingBottom: 15 },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  clinicName: { fontSize: 20, fontWeight: 'bold', color: '#1a4f8a', marginBottom: 4 },
  doctorName: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  doctorDetails: { color: '#666', fontSize: 9, lineHeight: 1.4 },
  patientSection: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f5f5f5', padding: 10, borderRadius: 4, marginBottom: 20 },
  patientText: { fontWeight: 'bold' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#1a4f8a', marginBottom: 8, marginTop: 10 },
  diagnosisText: { marginBottom: 15, lineHeight: 1.5 },
  table: { width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#e5e5e5', borderRightWidth: 0, borderBottomWidth: 0, marginBottom: 20 },
  tableRow: { margin: 'auto', flexDirection: 'row' },
  tableColHeader: { width: '13.33%', borderStyle: 'solid', borderWidth: 1, borderColor: '#e5e5e5', borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: '#1a4f8a', color: '#fff' },
  tableColHeaderWide: { width: '20%', borderStyle: 'solid', borderWidth: 1, borderColor: '#e5e5e5', borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: '#1a4f8a', color: '#fff' },
  tableCol: { width: '13.33%', borderStyle: 'solid', borderWidth: 1, borderColor: '#e5e5e5', borderLeftWidth: 0, borderTopWidth: 0 },
  tableColWide: { width: '20%', borderStyle: 'solid', borderWidth: 1, borderColor: '#e5e5e5', borderLeftWidth: 0, borderTopWidth: 0 },
  tableCellHeader: { margin: 5, fontSize: 9, fontWeight: 'bold' },
  tableCell: { margin: 5, fontSize: 9 },
  rowBg: { backgroundColor: '#f9f9f9' },
  notesSection: { marginTop: 10, padding: 10, borderLeft: '2pt solid #1a4f8a', backgroundColor: '#f9f9f9' },
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1pt solid #e5e5e5', paddingTop: 10 },
  signatureBox: { alignItems: 'center' },
  signatureLine: { width: 150, borderBottom: '1pt solid #000', marginBottom: 5 },
  footerText: { fontSize: 8, color: '#999' },
})

interface RxPDFProps {
  visit?: VisitMeasurements | null
  doctor: Pick<Doctor, 'name' | 'email'> & Partial<Pick<Doctor, 'license' | 'address' | 'phone'>>
  patient: Pick<Patient, 'name' | 'dob' | 'gender' | 'phone' | 'allergies'>
  prescription: Pick<Prescription, 'id' | 'createdAt' | 'diagnosis' | 'notes'> & { medicines: unknown; handwriting?: unknown; followUpDate?: Date | string | null }
  clinicName?: string
  handwritingPhoto?: string
  signatureUrl?: string
  paperSize?: 'A4' | 'A5'
  logoUrl?: string
}

export default function RxPDFDocument({ doctor, patient, prescription, clinicName = 'Clinic Name', logoUrl, signatureUrl, paperSize = 'A5', visit, handwritingPhoto }: RxPDFProps) {
  const handwriting = parseHandwriting(prescription.handwriting)
  const meds: RxMedicine[] = typeof prescription.medicines === 'string'
    ? JSON.parse(prescription.medicines as string)
    : (prescription.medicines as RxMedicine[] || [])
  const rxDate = new Date(prescription.createdAt || new Date())
  const dateText = rxDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })
  const timeText = rxDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })
  // Age
  let age = 'N/A'
  if (patient.dob) {
    const dob = new Date(patient.dob)
    const diff = Date.now() - dob.getTime()
    const ageDate = new Date(diff)
    age = Math.abs(ageDate.getUTCFullYear() - 1970) + ' Yrs'
  }
  return (
    <Document>
      <Page size={paperSize} style={styles.page}>
        <Text style={styles.watermark}>{clinicName}</Text>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoUrl && <Image src={logoUrl} style={{ width: 50, height: 50, marginBottom: 8 }} />}
            <Text style={styles.clinicName}>{clinicName}</Text>
            <Text style={styles.doctorName}>{doctor.name && (/^dr\.?\s/i.test(doctor.name) ? doctor.name : `Dr. ${doctor.name}`)}</Text>
            <Text style={styles.doctorDetails}>{doctor.email}</Text>
            {doctor.license && <Text style={styles.doctorDetails}>Reg: {doctor.license}</Text>}
            {doctor.address && <Text style={styles.doctorDetails}>{doctor.address}</Text>}
            {doctor.phone && <Text style={styles.doctorDetails}>{doctor.phone}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.doctorDetails}>Rx: {prescription.id}</Text>
            <Text style={styles.doctorDetails}>Date: {dateText}</Text>
            <Text style={styles.doctorDetails}>Time: {timeText}</Text>
          </View>
        </View>
        {/* Patient */}
        <View style={styles.patientSection}>
          <View>
            <Text>Patient: <Text style={styles.patientText}>{patient.name}</Text></Text>
            <Text style={{ marginTop: 4 }}>Phone: {patient.phone || 'N/A'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text>Age/Gender: <Text style={styles.patientText}>{age} / {patient.gender || 'N/A'}</Text></Text>
            <Text>Date: {dateText}</Text>
          </View>
        </View>
        {patient.allergies?.trim() && <Text style={{ color: '#991b1b', marginBottom: 8 }}>Allergies: {patient.allergies}</Text>}
        {formatVisitMeasurements(visit) && <Text style={{ marginBottom: 10 }}>{formatVisitMeasurements(visit)}</Text>}
        {/* Diagnosis */}
        {prescription.diagnosis && (
          <View>
            <Text style={styles.sectionTitle}>Diagnosis</Text>
            <Text style={styles.diagnosisText}>{prescription.diagnosis}</Text>
          </View>
        )}
        {/* Medicines Table */}
        {meds.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Rx</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>#</Text></View>
                <View style={styles.tableColHeaderWide}><Text style={styles.tableCellHeader}>Medicine</Text></View>
                <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Dosage</Text></View>
                <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Freq.</Text></View>
                <View style={styles.tableColHeaderWide}><Text style={styles.tableCellHeader}>Duration</Text></View>
                <View style={styles.tableColHeaderWide}><Text style={styles.tableCellHeader}>Instr.</Text></View>
              </View>
              {meds.map((med, i) => (
                <View key={med.id} wrap={false} style={i % 2 === 1 ? [styles.tableRow, styles.rowBg] : styles.tableRow}>
                  <View style={styles.tableCol}><Text style={styles.tableCell}>{i + 1}</Text></View>
                  <View style={styles.tableColWide}><Text style={styles.tableCell}>{med.name}{med.generic ? ` (${med.generic})` : ''}</Text></View>
                  <View style={styles.tableCol}><Text style={styles.tableCell}>{med.dosage}</Text></View>
                  <View style={styles.tableCol}><Text style={styles.tableCell}>{med.frequency}</Text></View>
                  <View style={styles.tableColWide}><Text style={styles.tableCell}>{med.duration}</Text></View>
                  <View style={styles.tableColWide}><Text style={styles.tableCell}>{medicineInstructions(med)}{med.quantity != null && med.doseUnit ? ` · Total: ${med.quantity} ${med.doseUnit}` : ''}</Text></View>
                </View>
              ))}
            </View>
          </View>
        )}
        {prescription.followUpDate && <Text style={{ marginTop: 8 }}>Follow-up: {new Date(prescription.followUpDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}</Text>}
        {/* Notes */}
        {prescription.notes && (
          <View>
            <Text style={styles.sectionTitle}>Notes & Advice</Text>
            <View style={styles.notesSection}><Text>{prescription.notes}</Text></View>
          </View>
        )}
        {/* Footer */}
        <View style={styles.footer} fixed>
          <View>
            <Text style={styles.footerText}>Digitally generated prescription</Text>
            <Text style={styles.footerText}>Date: {dateText}</Text>
          </View>
          <View style={styles.signatureBox}>
            {signatureUrl && <Image src={signatureUrl} style={{ width: 100, height: 35, objectFit: 'contain' }} />}
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{doctor.name && (/^dr\.?\s/i.test(doctor.name) ? doctor.name : `Dr. ${doctor.name}`)}</Text>
            <Text style={styles.footerText}>Signature</Text>
          </View>
        </View>
      </Page>
      {handwriting.strokes.length > 0 && <Page size={paperSize} style={styles.page}>
        <Text style={styles.clinicName}>{clinicName}</Text>
        <Text style={styles.sectionTitle}>Handwritten notes</Text>
        <Text>{patient.name} · {dateText}</Text>
        <Text style={{ ...styles.doctorDetails, marginTop: 5 }}>Rx: {prescription.id}</Text>
        <Svg viewBox="0 0 1000 600" style={{ width: '100%', height: paperSize === 'A5' ? 210 : 300, marginTop: 20 }}>
          {handwriting.strokes.map((stroke, index) => <Path key={index} d={strokePath(stroke)} stroke="#172a35" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
        </Svg>
      </Page>}
      {handwriting.photoId && handwritingPhoto && <Page size={paperSize} style={styles.page}>
        <Text style={styles.clinicName}>{clinicName}</Text>
        <Text style={styles.sectionTitle}>Attached paper note</Text>
        <Text>{patient.name} · {dateText}</Text>
        <Text style={{ ...styles.doctorDetails, marginTop: 5 }}>Rx: {prescription.id}</Text>
        <Image src={handwritingPhoto} style={{ width: '100%', height: paperSize === 'A5' ? 300 : 500, objectFit: 'contain', marginTop: 20 }} />
      </Page>}
    </Document>
  )
}
