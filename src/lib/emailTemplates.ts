// Email templates for NestHR notifications

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #2563eb; }
  .content { padding: 30px 0; }
  .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 12px; }
  .btn { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }
  .highlight { background-color: #f0f7ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
  .quote { border-left: 4px solid #2563eb; padding-left: 15px; font-style: italic; color: #555; }
`;

const wrapTemplate = (title: string, content: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="header">
    <h1 style="color: #2563eb; margin: 0;">NestHR</h1>
    <p style="color: #666; margin: 5px 0 0;">by LabelNest</p>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>This is an automated message from NestHR by LabelNest.</p>
    <p>© 2025 NestHR by LabelNest. All rights reserved.</p>
  </div>
</body>
</html>
`;

export const leaveApprovedTemplate = (data: {
  employeeName: string;
  managerName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
}): string => wrapTemplate('Leave Request Approved', `
  <h2 style="color: #16a34a;">Leave Request Approved ✅</h2>
  <p>Hi ${data.employeeName},</p>
  <p>Your leave request has been <strong>approved</strong> by ${data.managerName}.</p>
  <div class="highlight">
    <p style="margin: 5px 0;"><strong>Leave Type:</strong> ${data.leaveType}</p>
    <p style="margin: 5px 0;"><strong>From:</strong> ${data.startDate}</p>
    <p style="margin: 5px 0;"><strong>To:</strong> ${data.endDate}</p>
  </div>
  <p>Enjoy your time off!</p>
`);

export const leaveRejectedTemplate = (data: {
  employeeName: string;
  managerName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
}): string => wrapTemplate('Leave Request Rejected', `
  <h2 style="color: #dc2626;">Leave Request Rejected ❌</h2>
  <p>Hi ${data.employeeName},</p>
  <p>Your leave request has been <strong>rejected</strong> by ${data.managerName}.</p>
  <div class="highlight">
    <p style="margin: 5px 0;"><strong>Leave Type:</strong> ${data.leaveType}</p>
    <p style="margin: 5px 0;"><strong>From:</strong> ${data.startDate}</p>
    <p style="margin: 5px 0;"><strong>To:</strong> ${data.endDate}</p>
    ${data.reason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${data.reason}</p>` : ''}
  </div>
  <p>Please contact your manager for more details.</p>
`);

export const appreciationReceivedTemplate = (data: {
  recipientName: string;
  senderName: string;
  tag: string;
  message: string;
  appUrl: string;
}): string => wrapTemplate('You Received an Appreciation!', `
  <h2 style="color: #ec4899;">You received an appreciation! ❤️</h2>
  <p>Hi ${data.recipientName},</p>
  <p><strong>${data.senderName}</strong> appreciated you for <strong>${data.tag}</strong>!</p>
  <div class="quote">
    "${data.message}"
  </div>
  <p>Keep up the great work!</p>
  <p style="text-align: center; margin-top: 25px;">
    <a href="${data.appUrl}/app/appreciations?tab=received" class="btn">View Appreciation</a>
  </p>
`);

export const workLogApprovedTemplate = (data: {
  employeeName: string;
  managerName: string;
  weekRange: string;
  comment?: string;
}): string => wrapTemplate('Work Log Approved', `
  <h2 style="color: #16a34a;">Work Log Approved ✅</h2>
  <p>Hi ${data.employeeName},</p>
  <p>Your work log for <strong>${data.weekRange}</strong> has been approved by ${data.managerName}.</p>
  ${data.comment ? `
  <div class="highlight">
    <p style="margin: 0;"><strong>Manager's comment:</strong></p>
    <p style="margin: 5px 0 0;">${data.comment}</p>
  </div>
  ` : ''}
  <p>Great job on documenting your work!</p>
`);

export const workLogReworkTemplate = (data: {
  employeeName: string;
  managerName: string;
  weekRange: string;
  comment: string;
  appUrl: string;
}): string => wrapTemplate('Work Log - Rework Requested', `
  <h2 style="color: #ea580c;">Work Log - Rework Requested 🔄</h2>
  <p>Hi ${data.employeeName},</p>
  <p>Your manager has requested changes to your work log for <strong>${data.weekRange}</strong>.</p>
  <div class="highlight">
    <p style="margin: 0;"><strong>Manager's feedback:</strong></p>
    <p style="margin: 5px 0 0;">${data.comment}</p>
  </div>
  <p>Please review and resubmit your work log.</p>
  <p style="text-align: center; margin-top: 25px;">
    <a href="${data.appUrl}/app/work-log" class="btn">Update Work Log</a>
  </p>
`);

export const announcementTemplate = (data: {
  employeeName: string;
  title: string;
  content: string;
  appUrl: string;
}): string => wrapTemplate('New Announcement', `
  <h2 style="color: #2563eb;">📢 New Announcement</h2>
  <p>Hi ${data.employeeName},</p>
  <h3 style="color: #333;">${data.title}</h3>
  <div class="highlight">
    <p style="margin: 0;">${data.content}</p>
  </div>
  <p style="text-align: center; margin-top: 25px;">
    <a href="${data.appUrl}/app/announcements" class="btn">View Announcement</a>
  </p>
`);

export const regularizationApprovedTemplate = (data: {
  employeeName: string;
  date: string;
  oldStatus: string;
  newStatus: string;
  adminNotes?: string;
}): string => wrapTemplate('Attendance Regularization Approved', `
  <h2 style="color: #16a34a;">Attendance Regularization Approved ✅</h2>
  <p>Hi ${data.employeeName},</p>
  <p>Your attendance regularization request for <strong>${data.date}</strong> has been approved.</p>
  <div class="highlight">
    <p style="margin: 5px 0;"><strong>Status updated:</strong> ${data.oldStatus} → ${data.newStatus}</p>
    ${data.adminNotes ? `<p style="margin: 5px 0;"><strong>Admin notes:</strong> ${data.adminNotes}</p>` : ''}
  </div>
`);
