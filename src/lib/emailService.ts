import { supabase } from "@/integrations/supabase/client";
import {
  leaveApprovedTemplate,
  leaveRejectedTemplate,
  appreciationReceivedTemplate,
  workLogApprovedTemplate,
  workLogReworkTemplate,
  announcementTemplate,
  regularizationApprovedTemplate,
} from "./emailTemplates";

const SUPABASE_URL = "https://nqwvepnoadbfwrvkcjqh.supabase.co";

interface Employee {
  id: string;
  email: string;
  full_name: string;
  email_notifications_enabled?: boolean;
}

const getAppUrl = () => {
  return typeof window !== 'undefined' ? window.location.origin : '';
};

const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Email send failed:', error);
      return false;
    }

    console.log('Email sent successfully to:', to);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

const getEmployeeEmailPreference = async (employeeId: string): Promise<Employee | null> => {
  const { data, error } = await supabase
    .from('hr_employees')
    .select('id, email, full_name, email_notifications_enabled')
    .eq('id', employeeId)
    .single();

  if (error || !data) {
    console.error('Error fetching employee email preference:', error);
    return null;
  }

  return data;
};

export const sendLeaveApprovalEmail = async (
  employeeId: string,
  managerName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  approved: boolean,
  rejectionReason?: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return;

  const html = approved
    ? leaveApprovedTemplate({
        employeeName: employee.full_name,
        managerName,
        leaveType,
        startDate,
        endDate,
      })
    : leaveRejectedTemplate({
        employeeName: employee.full_name,
        managerName,
        leaveType,
        startDate,
        endDate,
        reason: rejectionReason,
      });

  const subject = approved ? 'Leave Request Approved ✅' : 'Leave Request Rejected ❌';

  await sendEmail(employee.email, subject, html);
};

export const sendAppreciationEmail = async (
  toEmployeeId: string,
  senderName: string,
  tag: string,
  message: string
) => {
  const employee = await getEmployeeEmailPreference(toEmployeeId);
  if (!employee || employee.email_notifications_enabled === false) return;

  const html = appreciationReceivedTemplate({
    recipientName: employee.full_name,
    senderName,
    tag,
    message,
    appUrl: getAppUrl(),
  });

  await sendEmail(employee.email, 'You received an appreciation! ❤️', html);
};

export const sendWorkLogEmail = async (
  employeeId: string,
  managerName: string,
  weekRange: string,
  approved: boolean,
  comment?: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return;

  const html = approved
    ? workLogApprovedTemplate({
        employeeName: employee.full_name,
        managerName,
        weekRange,
        comment,
      })
    : workLogReworkTemplate({
        employeeName: employee.full_name,
        managerName,
        weekRange,
        comment: comment || 'Please review your work log and make necessary changes.',
        appUrl: getAppUrl(),
      });

  const subject = approved ? 'Work Log Approved ✅' : 'Work Log - Rework Requested 🔄';

  await sendEmail(employee.email, subject, html);
};

export const sendAnnouncementEmail = async (
  employeeId: string,
  title: string,
  content: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return;

  const html = announcementTemplate({
    employeeName: employee.full_name,
    title,
    content,
    appUrl: getAppUrl(),
  });

  await sendEmail(employee.email, `📢 New Announcement: ${title}`, html);
};

export const sendRegularizationEmail = async (
  employeeId: string,
  date: string,
  oldStatus: string,
  newStatus: string,
  adminNotes?: string
) => {
  const employee = await getEmployeeEmailPreference(employeeId);
  if (!employee || employee.email_notifications_enabled === false) return;

  const html = regularizationApprovedTemplate({
    employeeName: employee.full_name,
    date,
    oldStatus,
    newStatus,
    adminNotes,
  });

  await sendEmail(employee.email, 'Attendance Regularization Approved ✅', html);
};
