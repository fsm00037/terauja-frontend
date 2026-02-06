export const API_URL = 'http://127.0.0.1:8001';

// --- Token Management ---
export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
}

export function setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', token);
}

// --- Token Management ---
export function clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
}

export async function logout(): Promise<void> {
    try {
        await fetchWithAuth(`${API_URL}/logout`, { method: 'POST' });
    } catch (e) {
        console.error("Logout error", e);
    } finally {
        clearToken();
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }
}

export async function sendHeartbeat(): Promise<void> {
    try {
        await fetchWithAuth(`${API_URL}/heartbeat`, { method: 'POST' });
    } catch (e) {
        // Silent fail for heartbeat
    }
}

// Authenticated fetch wrapper
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = getToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    // Handle 401 - unauthorized (token expired or invalid)
    if (response.status === 401) {
        clearToken();
        // Redirect to login if in browser
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }

    return response;
}

// Backend Type
interface BackendPatient {
    id: number;
    patient_code: string;
    access_code: string;
    psychologist_id?: number;
    psychologist_name?: string;
    psychologist_schedule?: string;
    created_at: string;
    clinical_summary?: string;
    unread_messages?: number;
    unread_questionnaires?: number;
    is_online?: boolean;
    total_online_seconds?: number;
    last_active?: string;
}

export interface Psychologist {
    id: string
    name: string
    email: string
    role: "admin" | "psychologist" | "superadmin"
    schedule: string
    phone?: string
    totalOnlineSeconds?: number
    lastActive?: string
    ai_style?: string
    ai_tone?: string
    ai_instructions?: string
}

export interface LoginResponse {
    id: number
    name: string
    role: string
    email: string
    access_token: string
}

// Frontend Type
export interface Patient {
    id: string;
    name: string; // Will display patient_code
    patientCode: string; // Mapped from access_code
    access_code: string; // Kept for reference
    psychologistId?: string;
    psychologistName?: string;
    psychologistSchedule?: string;
    unreadMessages: number;
    unreadQuestionnaires: number;
    uncheckedQuestionnaires: number;
    lastContact: string;
    status: "active" | "inactive";
    isOnline: boolean;
    totalOnlineSeconds?: number;
    lastActive?: string;
    created_at: string;
    clinical_summary?: string;
}

export async function getPatients(psychologistId?: string): Promise<Patient[]> {
    try {
        let url = `${API_URL}/patients`;
        if (psychologistId) {
            url += `?psychologist_id=${psychologistId}`;
        }
        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Failed to fetch patients');

        const backendPatients: BackendPatient[] = await res.json();

        return backendPatients.map(p => ({
            id: p.id.toString(),
            name: p.patient_code, // Main identifier now
            patientCode: p.patient_code, // Redundant but consistent
            access_code: p.access_code,
            psychologistId: p.psychologist_id?.toString(),
            psychologistName: p.psychologist_name,
            psychologistSchedule: p.psychologist_schedule,
            unreadMessages: p.unread_messages || 0,
            unreadQuestionnaires: p.unread_questionnaires || 0,
            uncheckedQuestionnaires: 0, // Default
            lastContact: new Date(p.created_at).toISOString().split('T')[0],
            status: "active",
            isOnline: p.is_online || false,
            totalOnlineSeconds: p.total_online_seconds || 0,
            lastActive: p.last_active,
            created_at: p.created_at,
            clinical_summary: p.clinical_summary
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function createPatient(patientCode: string, psychologistId?: string): Promise<Patient | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients`, {
            method: 'POST',
            body: JSON.stringify({
                patient_code: patientCode,
                psychologist_id: psychologistId ? parseInt(psychologistId) : undefined
            }),
        });
        if (!res.ok) throw new Error('Failed to create patient');

        const p: BackendPatient = await res.json();
        console.log("createPatient response:", p); // Debugging

        if (!p || typeof p.id === 'undefined') {
            console.error("Invalid patient creation response:", p);
            return null;
        }

        return {
            id: p.id.toString(),
            name: p.patient_code,
            patientCode: p.patient_code,
            access_code: p.access_code,
            psychologistName: p.psychologist_name,
            psychologistSchedule: p.psychologist_schedule,
            unreadMessages: 0,
            unreadQuestionnaires: 0,
            uncheckedQuestionnaires: 0,
            lastContact: new Date(p.created_at).toISOString().split('T')[0],
            status: "active",
            isOnline: false,
            created_at: p.created_at
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function deletePatient(id: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function regeneratePatientCode(patientId: string): Promise<string | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients/${patientId}/regenerate-code`, {
            method: 'POST'
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.access_code;
    } catch (e) {
        console.error(e);
        return null;
    }
}


export interface Note {
    id: string;
    title: string;
    content: string;
    color: string;
    date: string;
    author: string;
}

export async function getNotes(patientId: string): Promise<Note[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/notes/${patientId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((n: any) => ({
            id: n.id.toString(),
            title: n.title,
            content: n.content,
            color: n.color,
            date: new Date(n.created_at).toISOString().split('T')[0],
            author: "Dr. Smith"
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function createNote(patientId: string, title: string, content: string, color: string): Promise<Note | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/notes`, {
            method: 'POST',
            body: JSON.stringify({ patient_id: patientId, title, content, color })
        });
        if (!res.ok) return null;
        const n = await res.json();
        return {
            id: n.id.toString(),
            title: n.title,
            content: n.content,
            color: n.color,
            date: new Date(n.created_at).toISOString().split('T')[0],
            author: "Dr. Smith"
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function deleteNote(noteId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/notes/${noteId}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

// --- Chat Messages ---
export interface ChatMessage {
    id: number
    patient_id: number
    content: string
    is_from_patient: boolean
    created_at: string
    was_edited_by_human: boolean
    ai_suggestion_log_id: number
}

export async function getMessages(patientId: string): Promise<ChatMessage[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/messages/${patientId}`);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function sendMessage(payload: {
    patient_id: number | string,
    content: string,
    is_from_patient: boolean,
    ai_suggestion_log_id?: number | null,
    selected_option?: number | null,
    was_edited_by_human?: boolean,
}) {
    const res = await fetchWithAuth(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Error sending message");
    return await res.json();
}

export async function markMessagesAsRead(patientId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/messages/mark-read/${patientId}`, {
            method: 'POST',
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function markQuestionnaireAsRead(completionId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assignments/completions/${completionId}/read`, {
            method: 'PATCH',
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function clearChat(patientId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/messages/${patientId}`, {
            method: 'DELETE',
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export interface AiRecommendationsResponse {
    recommendations: string[];
    ai_suggestion_log_id: number;
}

export async function getChatRecommendations(messages: any[], patientId: number): Promise<AiRecommendationsResponse | null> {
    try {
        const payload = messages.map(m => ({
            role: m.sender === "therapist" ? "assistant" : "user",
            content: m.text
        }));

        const res = await fetchWithAuth(`${API_URL}/chat/recommendations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: payload,
                patient_id: patientId
            }),
        });

        if (!res.ok) {
            console.error("Error en la respuesta de recomendaciones:", await res.text());
            return null;
        }

        const data = await res.json();
        return data;
    } catch (e) {
        console.error("Error en getChatRecommendations:", e);
        return null;
    }
}

// --- Auth & Admin ---
export async function login(email: string, password: string): Promise<LoginResponse | null> {
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return null;
        const data = await res.json();

        // Store the JWT token
        if (data.access_token) {
            setToken(data.access_token);
        }

        return data;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function createPsychologist(name: string, email: string): Promise<Psychologist | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/psychologists`, {
            method: 'POST',
            body: JSON.stringify({ name, email }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return { ...data, id: data.id.toString() };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getPsychologists(): Promise<Psychologist[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/psychologists`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((p: any) => ({
            ...p,
            id: p.id.toString(),
            totalOnlineSeconds: p.total_online_seconds || 0,
            lastActive: p.last_active
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}


export async function deletePsychologist(id: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/psychologists/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function getUserProfile(userId: string): Promise<Psychologist | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/profile/${userId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return { ...data, id: data.id.toString() };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateUserProfile(userId: string, data: Partial<Psychologist>): Promise<Psychologist | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/profile/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (!res.ok) return null;
        const resData = await res.json();
        return { ...resData, id: resData.id.toString() };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function assignPatientToPsychologist(patientId: string, psychologistId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients/${patientId}/assign`, {
            method: 'PATCH',
            body: JSON.stringify({ psychologist_id: parseInt(psychologistId) }),
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

// --- Questionnaires ---

export interface Question {
    id: string
    text: string
    type: "likert" | "frequency" | "openText"
    options?: string[]
    min?: number
    max?: number
    minLabel?: string
    maxLabel?: string
}

export interface Questionnaire {
    id: string
    title: string
    icon: string
    questions: Question[]
    createdAt: string
}

export async function getQuestionnaires(): Promise<Questionnaire[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/questionnaires`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((q: any) => ({
            id: q.id.toString(),
            title: q.title,
            icon: q.icon || "FileQuestion",
            questions: q.questions,
            createdAt: q.created_at
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function createQuestionnaire(title: string, icon: string, questions: Question[]): Promise<Questionnaire | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/questionnaires`, {
            method: 'POST',
            body: JSON.stringify({ title, icon, questions })
        });
        if (!res.ok) return null;
        const q = await res.json();
        console.log("createQuestionnaire response:", q); // Debugging

        if (!q || typeof q.id === 'undefined') {
            console.error("Invalid questionnaire creation response:", q);
            return null;
        }

        return {
            id: q.id.toString(),
            title: q.title,
            icon: q.icon,
            questions: q.questions,
            createdAt: q.created_at
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateQuestionnaire(id: string, title: string, icon: string, questions: Question[]): Promise<Questionnaire | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/questionnaires/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ title, icon, questions })
        });
        if (!res.ok) return null;
        const q = await res.json();
        return {
            id: q.id.toString(),
            title: q.title,
            icon: q.icon,
            questions: q.questions,
            createdAt: q.created_at
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function deleteQuestionnaire(id: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/questionnaires/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

// --- Assignments ---

export interface Assignment {
    id: string
    patientId: string
    questionnaireId: string
    startDate: string
    endDate: string
    frequencyType: "weekly" | "daily"
    frequencyCount: number
    windowStart: string
    windowEnd: string
    deadlineHours: number
    minHoursBetween?: number
    status: "active" | "paused" | "completed"
    answers?: any[] // Answers when completed
    assignedAt?: string
    nextScheduledAt?: string
    questionnaire?: {
        id: number
        title: string
        icon: string
        questions: Question[]
    }
}

export async function getAssignments(): Promise<Assignment[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assignments`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((a: any) => ({
            id: a.id.toString(),
            patientId: a.patient_id.toString(),
            questionnaireId: a.questionnaire_id.toString(),
            startDate: a.start_date,
            endDate: a.end_date,
            frequencyType: a.frequency_type,
            frequencyCount: a.frequency_count,
            windowStart: a.window_start,
            windowEnd: a.window_end,
            deadlineHours: a.deadline_hours,
            minHoursBetween: a.min_hours_between,
            status: a.status,
            assignmentType: a.assignment_type,
            sentAt: a.sent_at,
            questionnaire: a.questionnaire ? {
                id: a.questionnaire.id.toString(),
                title: a.questionnaire.title,
                icon: a.questionnaire.icon || "FileQuestion",
                questions: a.questionnaire.questions
            } : undefined
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function createAssignment(assignment: Omit<Assignment, "id">): Promise<Assignment | null> {
    try {
        const payload = {
            patient_id: parseInt(assignment.patientId),
            questionnaire_id: parseInt(assignment.questionnaireId),
            start_date: assignment.startDate,
            end_date: assignment.endDate,
            frequency_type: assignment.frequencyType,
            frequency_count: assignment.frequencyCount,
            window_start: assignment.windowStart,
            window_end: assignment.windowEnd,
            deadline_hours: assignment.deadlineHours,
            min_hours_between: assignment.minHoursBetween,
            next_scheduled_at: assignment.nextScheduledAt,
            status: "active"
        };

        const res = await fetchWithAuth(`${API_URL}/assignments`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!res.ok) return null;
        const a = await res.json();

        return {
            id: a.id.toString(),
            patientId: a.patient_id.toString(),
            questionnaireId: a.questionnaire_id.toString(),
            startDate: a.start_date,
            endDate: a.end_date,
            frequencyType: a.frequency_type,
            frequencyCount: a.frequency_count,
            windowStart: a.window_start,
            windowEnd: a.window_end,
            deadlineHours: a.deadline_hours,
            minHoursBetween: a.min_hours_between,
            status: a.status
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateAssignmentStatus(id: string, status: "active" | "paused" | "completed"): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assignments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function patientLogin(patientCode: string, accessCode: string): Promise<Patient | null> {
    try {
        const res = await fetch(`${API_URL}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patient_code: patientCode, access_code: accessCode }),
        });

        if (!res.ok) return null;
        const data = await res.json();

        if (data.access_token) {
            setToken(data.access_token);
            if (typeof window !== 'undefined') {
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('userRole', 'patient');
                localStorage.setItem('userId', data.id.toString());
            }
        }

        return {
            id: data.id.toString(),
            name: data.patient_code,
            patientCode: data.patient_code,
            access_code: data.access_code,
            psychologistId: data.psychologist_id?.toString(),
            psychologistName: data.psychologist_name,
            psychologistSchedule: data.psychologist_schedule,
            unreadMessages: 0,
            unreadQuestionnaires: 0,
            uncheckedQuestionnaires: 0,
            lastContact: new Date().toISOString().split('T')[0],
            status: "active",
            isOnline: true,
            created_at: new Date().toISOString()
        };
    } catch (e) {
        console.error("Patient login error:", e);
        return null;
    }
}

export async function deleteAssignment(id: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assignments/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export interface QuestionnaireCompletion {
    id: string
    assignmentId: string
    patientId: string
    questionnaireId: string
    answers?: any[]
    scheduledAt?: string
    completedAt?: string
    status: "pending" | "completed" | "missed" | "sent"
    isDelayed: boolean
    deadlineHours?: number
    questionnaire?: {
        title: string
        icon: string
        questions?: Question[]
    }
}

export async function getQuestionnaireCompletions(patientId: string): Promise<QuestionnaireCompletion[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assignments/completions/${patientId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((c: any) => ({
            id: c.id.toString(),
            assignmentId: c.assignment_id.toString(),
            patientId: c.patient_id.toString(),
            questionnaireId: c.questionnaire_id.toString(),
            answers: c.answers,
            scheduledAt: c.scheduled_at,
            completedAt: c.completed_at,
            status: c.status,
            isDelayed: c.is_delayed,
            deadlineHours: c.deadline_hours,
            questionnaire: c.questionnaire ? {
                title: c.questionnaire.title,
                icon: c.questionnaire.icon || "FileQuestion",
                questions: c.questionnaire.questions
            } : undefined
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function deleteQuestionnaireCompletion(id: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assignments/completions/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

// Get assignments for a specific patient (admin view)
export async function getPatientAssignments(patientId: string): Promise<Assignment[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assignments/patient-admin/${patientId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((a: any) => ({
            id: a.id.toString(),
            patientId: a.patient_id.toString(),
            questionnaireId: a.questionnaire_id.toString(),
            startDate: a.start_date,
            endDate: a.end_date,
            frequencyType: a.frequency_type,
            frequencyCount: a.frequency_count,
            windowStart: a.window_start,
            windowEnd: a.window_end,
            deadlineHours: a.deadline_hours,
            status: a.status,
            answers: a.answers,
            assignedAt: a.assigned_at,
            questionnaire: a.questionnaire ? {
                id: a.questionnaire.id,
                title: a.questionnaire.title,
                icon: a.questionnaire.icon || 'FileQuestion',
                questions: a.questionnaire.questions || []
            } : undefined
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

// --- Sessions ---
export interface ChatMessageSnapshot {
    id?: string;
    text: string;
    sender: "patient" | "therapist";
    timestamp: string;
    // Datos de IA (solo presentes si el sender es therapist y usó IA)
    ai_suggestion_log_id?: number;
    was_edited_by_human?: boolean;
}
export async function updateQuestionnaireCompletion(id: string, updates: { scheduledAt?: string, status?: string }): Promise<QuestionnaireCompletion | null> {
    try {
        const payload: any = {};
        if (updates.scheduledAt) payload.scheduled_at = updates.scheduledAt;
        if (updates.status) payload.status = updates.status;

        const res = await fetchWithAuth(`${API_URL}/assignments/completions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) return null;
        const c = await res.json();
        console.log("updateQuestionnaireCompletion response:", c);

        return {
            id: c.id?.toString() || "",
            assignmentId: c.assignment_id?.toString() || "",
            patientId: c.patient_id?.toString() || "",
            questionnaireId: c.questionnaire_id?.toString() || "",
            answers: c.answers,
            scheduledAt: c.scheduled_at,
            completedAt: c.completed_at,
            status: c.status,
            isDelayed: c.is_delayed,
            questionnaire: c.questionnaire ? {
                title: c.questionnaire.title,
                icon: c.questionnaire.icon || "FileQuestion"
            } : undefined
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

// --- Sessions ---
export interface Session {
    id: string
    patient_id: string
    date: string
    duration: string
    description: string
    notes: string
    chatHistory: ChatMessageSnapshot[];
}

export async function getSessions(patientId: string): Promise<Session[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/sessions/${patientId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((s: any) => ({
            id: s.id.toString(),
            patient_id: s.patient_id.toString(),
            date: s.date,
            duration: s.duration,
            description: s.description,
            notes: s.notes,
            chatHistory: s.chat_snapshot || []
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function createSession(session: Omit<Session, "id" | "date"> & { date?: string }): Promise<Session | null> {
    try {
        const payload = {
            patient_id: parseInt(session.patient_id),
            ...(session.date ? { date: session.date } : {}),
            duration: session.duration,
            description: session.description,
            notes: session.notes,
            chat_snapshot: session.chatHistory
        };
        const res = await fetchWithAuth(`${API_URL}/sessions`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (!res.ok) return null;
        const s = await res.json();
        if (!s || !s.id) {
            console.error("Invalid session creation response:", s);
            return null;
        }
        return {
            id: s.id.toString(),
            patient_id: s.patient_id.toString(),
            date: s.date,
            duration: s.duration,
            description: s.description,
            notes: s.notes,
            chatHistory: s.chat_snapshot || []
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateSession(sessionId: string, session: Partial<Omit<Session, "id" | "patient_id">>): Promise<Session | null> {
    try {
        const payload = {
            ...session,
            chat_snapshot: session.chatHistory
        };
        delete (payload as any).chatHistory;

        const res = await fetchWithAuth(`${API_URL}/sessions/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) return null;
        const s = await res.json();

        return {
            id: s.id.toString(),
            patient_id: s.patient_id.toString(),
            date: s.date,
            duration: s.duration,
            description: s.description,
            notes: s.notes,
            chatHistory: s.chat_snapshot || []
        };
    } catch (e) {
        console.error("Error updating session:", e);
        return null;
    }
}

export async function deleteSession(sessionId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/sessions/${sessionId}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

// --- Assessment Stats ---
export interface AssessmentStat {
    id: string
    patient_id: string
    label: string
    value: string
    status: "mild" | "moderate" | "high" | "severe"
    color: "teal" | "amber" | "coral"
    created_at: string
    updated_at: string
}

export async function getAssessmentStats(patientId: string): Promise<AssessmentStat[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assessment-stats/${patientId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((s: any) => ({
            id: s.id.toString(),
            patient_id: s.patient_id.toString(),
            label: s.label,
            value: s.value,
            status: s.status,
            color: s.color,
            created_at: s.created_at,
            updated_at: s.updated_at
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function createAssessmentStat(patientId: string, data: Omit<AssessmentStat, "id" | "patient_id" | "created_at" | "updated_at">): Promise<AssessmentStat | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assessment-stats`, {
            method: 'POST',
            body: JSON.stringify({ patient_id: parseInt(patientId), ...data })
        });
        if (!res.ok) return null;
        const s = await res.json();
        return {
            id: s.id.toString(),
            patient_id: s.patient_id.toString(),
            label: s.label,
            value: s.value,
            status: s.status,
            color: s.color,
            created_at: s.created_at,
            updated_at: s.updated_at
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateAssessmentStat(statId: string, data: Omit<AssessmentStat, "id" | "patient_id" | "created_at" | "updated_at">): Promise<AssessmentStat | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assessment-stats/${statId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!res.ok) return null;
        const s = await res.json();
        return {
            id: s.id.toString(),
            patient_id: s.patient_id.toString(),
            label: s.label,
            value: s.value,
            status: s.status,
            color: s.color,
            created_at: s.created_at,
            updated_at: s.updated_at
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function deleteAssessmentStat(statId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assessment-stats/${statId}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

// Update patient clinical summary
export async function updateClinicalSummary(patientId: string, summary: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients/${patientId}/clinical-summary`, {
            method: 'PATCH',
            body: JSON.stringify({ clinical_summary: summary })
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}
// Dashboard Stats
export async function getDashboardStats(psychologistId?: string) {
    try {
        let url = `${API_URL}/dashboard/stats`;
        if (psychologistId) {
            url += `?psychologist_id=${psychologistId}`;
        }
        const res = await fetchWithAuth(url);
        if (!res.ok) return { total_patients: 0, total_messages: 0, recent_activity: [], completed_questionnaires: 0, pending_questionnaires: 0 };
        return await res.json();
    } catch (e) {
        console.error(e);
        return { total_patients: 0, total_messages: 0, recent_activity: [], completed_questionnaires: 0, pending_questionnaires: 0 };
    }
}

// --- Superadmin ---

export interface PlatformStats {
    total_psychologists: number
    total_patients: number
    online_psychologists: number
    online_patients: number
    total_messages_psychologist: number
    total_messages_patient: number
}

export interface DailyMessageStat {
    date: string
    patient_count: number
    psychologist_count: number
}

export interface DetailedPsychologist {
    id: number
    name: string
    email: string
    role: string
    is_online: boolean
    patients_count: number
    sessions_count: number
    ai_clicks: number
    message_count: number
    word_count: number
}

export interface DetailedPatient {
    id: number
    name: string
    patient_code: string
    psychologist_name: string
    is_online: boolean
    message_count: number
    word_count: number
    total_online_seconds: number
    last_active: string
}

export interface DetailedUsersResponse {
    psychologists: DetailedPsychologist[]
    patients: DetailedPatient[]
}

export async function getPlatformStats(): Promise<PlatformStats | null> {
    try {
        const response = await fetchWithAuth(`${API_URL}/superadmin/stats`)
        if (!response.ok) return null
        return await response.json()
    } catch (e) {
        console.error(e)
        return null
    }
}

export async function getDailyMessageStats(): Promise<DailyMessageStat[]> {
    try {
        const response = await fetchWithAuth(`${API_URL}/superadmin/stats/daily-messages`)
        if (!response.ok) return []
        return await response.json()
    } catch (e) {
        console.error(e)
        return []
    }
}

export async function getDetailedUsers(): Promise<DetailedUsersResponse | null> {
    try {
        const response = await fetchWithAuth(`${API_URL}/superadmin/users/detailed`)
        if (!response.ok) return null
        return await response.json()
    } catch (e) {
        console.error(e)
        return null
    }
}

export async function createSystemUser(user: Partial<Psychologist>): Promise<Psychologist | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/superadmin/users`, {
            method: 'POST',
            body: JSON.stringify(user)
        });
        if (!res.ok) return null;
        const data = await res.json();
        return { ...data, id: data.id.toString() };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getSystemUsers(): Promise<Psychologist[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/superadmin/users`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((p: any) => ({
            ...p,
            id: p.id.toString()
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}
