import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

const { Schema } = mongoose;
const id = { type: String, default: randomUUID };
const owned = { ownerId: { type: String, required: true, index: true } };
const baseOptions = { timestamps: true, versionKey: false, toJSON: { virtuals: true } };

const userSchema = new Schema({
  _id: id,
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ["USER", "DEVELOPER", "ADMIN", "DRIVER"], default: "USER", index: true },
  emailVerified: { type: Boolean, default: false },
  status: { type: String, enum: ["ACTIVE", "DISABLED"], default: "ACTIVE" },
  resetTokenHash: { type: String, select: false },
  resetTokenExpiresAt: Date,
  verificationTokenHash: { type: String, select: false },
  verificationTokenExpiresAt: Date,
  verificationAttempts: { type: Number, default: 0 },
  preferences: { theme: { type: String, enum: ["system", "light", "dark"], default: "system" }, sound: { type: Boolean, default: false } }
}, baseOptions);

const sessionSchema = new Schema({
  _id: id,
  userId: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: Date,
  userAgent: String,
  ipHash: String
}, baseOptions);

const invitationSchema = new Schema({
  _id: id,
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ["DEVELOPER", "ADMIN", "DRIVER"], required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  createdBy: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  usedAt: Date
}, baseOptions);

const patientSchema = new Schema({
  _id: id, ...owned, name: { type: String, required: true }, relationship: String, dateOfBirth: String,
  gender: String, phone: String, email: String, bloodGroup: String, allergies: [String], emergencyNotes: String
}, baseOptions);
const patientAvatarSchema = new Schema({ _id: id, ...owned, patientId: { type: String, required: true, unique: true, index: true }, storageKey: { type: String, required: true }, mimeType: String, size: Number }, baseOptions);
const familySchema = new Schema({ _id: id, ...owned, name: { type: String, required: true }, description: String }, baseOptions);
const familyMemberSchema = new Schema({ _id: id, ...owned, familyId: { type: String, required: true, index: true }, patientId: String, name: String, relationship: String }, baseOptions);
const historySchema = new Schema({ _id: id, ...owned, patientId: { type: String, required: true, index: true }, kind: String, title: { type: String, required: true }, occurredOn: String, notes: String }, baseOptions);
const reportSchema = new Schema({ _id: id, ...owned, patientId: { type: String, required: true, index: true }, title: String, originalName: String, storageKey: String, mimeType: String, size: Number, status: String, ocrStatus: String, analysisStatus: String }, baseOptions);
const medicationSchema = new Schema({ _id: id, ...owned, patientId: { type: String, required: true, index: true }, name: { type: String, required: true }, dose: String, schedule: String, startDate: String, endDate: String, notes: String }, baseOptions);
const prescriptionSchema = new Schema({ _id: id, ...owned, patientId: { type: String, required: true, index: true }, clinicianName: String, issuedOn: String, medicationIds: [String], notes: String }, baseOptions);
const timelineSchema = new Schema({ _id: id, ...owned, patientId: { type: String, required: true, index: true }, type: String, title: { type: String, required: true }, occurredAt: Date, sourceId: String, notes: String }, baseOptions);
const emergencyCardSchema = new Schema({ _id: id, ...owned, patientId: { type: String, required: true, index: true }, bloodGroup: String, allergies: [String], conditions: [String], medications: [String], contacts: [{ name: String, phone: String, relationship: String }], publishedAt: Date }, baseOptions);
const diseaseSchema = new Schema({ _id: id, name: { type: String, required: true }, aliases: [String], symptoms: [String], redFlags: [String], specialty: String, sourceKey: { type: String, unique: true, sparse: true }, source: String, status: { type: String, default: "ACTIVE" }, verifiedAt: Date }, baseOptions);
const protocolSchema = new Schema({ _id: id, sourceId: { type: String, required: true, unique: true }, category: String, severity: String, title: String, tags: [String], warning: String, steps: [String], doNot: [String], seek: String, sourceKey: { type: String, unique: true }, status: { type: String, default: "ACTIVE" }, verifiedAt: Date }, baseOptions);
const doctorSchema = new Schema({ _id: id, name: String, specialty: String, qualifications: [String], registrationNumber: String, hospitalIds: [String], availability: [String], verifiedAt: Date, sourceKey: { type: String, unique: true, sparse: true }, status: { type: String, default: "ACTIVE" } }, baseOptions);
const hospitalSchema = new Schema({ _id: id, name: { type: String, required: true }, type: String, address: String, phone: String, emergency: Boolean, beds: Number, specialties: [String], note: String, opd: Schema.Types.Mixed, sourceKey: { type: String, required: true, unique: true }, source: String, status: { type: String, default: "ACTIVE" }, verifiedAt: Date }, baseOptions);
const ambulanceSchema = new Schema({ _id: id, code: { type: String, unique: true }, driverId: String, status: String, simulation: Boolean, latitude: Number, longitude: Number, available: Boolean, verifiedAt: Date }, baseOptions);
const driverSchema = new Schema({ _id: id, userId: { type: String, required: true, unique: true }, licenseNumber: String, ambulanceId: String, status: String, verifiedAt: Date }, baseOptions);
const ambulanceRequestSchema = new Schema({ _id: id, ...owned, patientId: String, pickup: Schema.Types.Mixed, destinationHospitalId: String, priority: String, status: String, ambulanceId: String, driverId: String, simulation: Boolean, etaMinutes: Number, statusHistory: [Schema.Types.Mixed] }, baseOptions);
const emergencySessionSchema = new Schema({ _id: id, ...owned, patientId: String, status: String, protocolId: String, ambulanceRequestId: String, openedAt: Date, closedAt: Date }, baseOptions);
const flashcardSchema = new Schema({ _id: id, question: String, answer: String, category: String, sourceKey: { type: String, required: true, unique: true }, source: String, status: { type: String, default: "ACTIVE" }, verifiedAt: Date }, baseOptions);
const quizSchema = new Schema({ _id: id, title: String, category: String, questions: [Schema.Types.Mixed], sourceKey: { type: String, unique: true, sparse: true }, status: { type: String, default: "ACTIVE" }, verifiedAt: Date }, baseOptions);
const progressSchema = new Schema({ _id: id, ...owned, flashcardId: String, quizId: String, correct: Number, attempts: Number, lastStudiedAt: Date }, baseOptions);
const notificationSchema = new Schema({ _id: id, ...owned, type: String, title: String, message: String, readAt: Date, actionUrl: String }, baseOptions);
const auditSchema = new Schema({ _id: id, actorId: { type: String, index: true }, action: String, resource: String, resourceId: String, outcome: String, requestId: String, ipHash: String, occurredAt: { type: Date, default: Date.now, index: true } }, { ...baseOptions, timestamps: false });
const consentSchema = new Schema({ _id: id, ...owned, patientId: String, scope: String, granted: Boolean, grantedAt: Date, revokedAt: Date, version: String }, baseOptions);

const definitions = {
  users: ["User", userSchema], sessions: ["Session", sessionSchema], developerInvitations: ["DeveloperInvitation", invitationSchema],
  patients: ["Patient", patientSchema], patientAvatars: ["PatientAvatar", patientAvatarSchema], families: ["Family", familySchema], familyMembers: ["FamilyMember", familyMemberSchema],
  medicalHistory: ["MedicalHistory", historySchema], medicalReports: ["MedicalReport", reportSchema], medications: ["Medication", medicationSchema],
  prescriptions: ["Prescription", prescriptionSchema], timelineEvents: ["TimelineEvent", timelineSchema], emergencyHealthCards: ["EmergencyHealthCard", emergencyCardSchema],
  diseases: ["Disease", diseaseSchema], medicalProtocols: ["MedicalProtocol", protocolSchema], doctors: ["Doctor", doctorSchema],
  hospitals: ["Hospital", hospitalSchema], ambulances: ["Ambulance", ambulanceSchema], drivers: ["Driver", driverSchema],
  ambulanceRequests: ["AmbulanceRequest", ambulanceRequestSchema], emergencySessions: ["EmergencySession", emergencySessionSchema],
  flashcards: ["Flashcard", flashcardSchema], quizzes: ["Quiz", quizSchema], learningProgress: ["LearningProgress", progressSchema],
  notifications: ["Notification", notificationSchema], auditLogs: ["AuditLog", auditSchema], consents: ["Consent", consentSchema]
};

export const models = Object.fromEntries(Object.entries(definitions).map(([key, [name, schema]]) => [key, mongoose.models[name] ?? mongoose.model(name, schema)]));
