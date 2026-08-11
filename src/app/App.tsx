import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { ForgotPasswordPage, ResetPasswordPage } from '@/features/auth/PasswordPages'
import { LoginPage } from '@/features/auth/LoginPage'
import { MfaPage } from '@/features/auth/MfaPage'
import { ModuleRoute } from '@/features/auth/ModuleRoute'
import { ProtectedRoute, SignedInRoute } from '@/features/auth/ProtectedRoute'
import { SecuritySetupPage } from '@/features/auth/SecuritySetupPage'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { CollaboratorsPage } from '@/features/collaborators/CollaboratorsPage'
import { CompaniesPage } from '@/features/companies/CompaniesPage'
import { FilesPage } from '@/features/files/FilesPage'
import { HomePage } from '@/features/home/HomePage'
import { InboxPage } from '@/features/inbox/InboxPage'
import { MarketingPage } from '@/features/marketing/MarketingPage'
import { PaymentsPage } from '@/features/payments/PaymentsPage'
import { PeoplePage } from '@/features/people/PeoplePage'
import { PipelinePage } from '@/features/pipeline/PipelinePage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { MorePage, NotFoundPage, NotificationsPage, SearchPage } from '@/features/shared/UtilityPages'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { TasksPage } from '@/features/tasks/TasksPage'
import { TrashPage } from '@/features/trash/TrashPage'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
      <Route path="/reset-password" element={<ResetPasswordPage/>}/>
      <Route element={<SignedInRoute/>}>
        <Route path="/security/setup" element={<SecuritySetupPage/>}/>
        <Route path="/mfa" element={<MfaPage/>}/>
      </Route>
      <Route element={<ProtectedRoute/>}>
        <Route element={<AppShell/>}>
          <Route index element={<HomePage/>}/>
          <Route element={<ModuleRoute module="people"/>}>
            <Route path="/people" element={<PeoplePage/>}/>
          </Route>
          <Route element={<ModuleRoute module="companies"/>}>
            <Route path="/companies" element={<CompaniesPage/>}/>
          </Route>
          <Route element={<ModuleRoute module="pipeline"/>}>
            <Route path="/pipeline" element={<PipelinePage/>}/>
          </Route>
          <Route element={<ModuleRoute module="projects"/>}>
            <Route path="/projects" element={<ProjectsPage/>}/>
          </Route>
          <Route element={<ModuleRoute module="tasks"/>}>
            <Route path="/tasks" element={<TasksPage/>}/>
          </Route>
          <Route element={<ModuleRoute module="calendar"/>}>
            <Route path="/calendar" element={<CalendarPage/>}/>
          </Route>
          <Route element={<ModuleRoute module="inbox"/>}>
            <Route path="/inbox" element={<InboxPage/>}/>
          </Route>
          <Route element={<ModuleRoute module="files"/>}>
            <Route path="/files" element={<FilesPage/>}/>
          </Route>
          <Route element={<ModuleRoute module="marketing"/>}>
            <Route path="/marketing" element={<MarketingPage/>}/>
          </Route>
          <Route element={<ModuleRoute module="reports"/>}>
            <Route path="/reports" element={<ReportsPage/>}/>
          </Route>
          <Route element={<ModuleRoute module="payments"/>}>
            <Route path="/payments" element={<PaymentsPage/>}/>
          </Route>
          <Route element={<ModuleRoute module="settings"/>}>
            <Route path="/settings" element={<SettingsPage/>}/>
          </Route>
          <Route element={<ModuleRoute module="trash"/>}>
            <Route path="/trash" element={<TrashPage/>}/>
          </Route>
          <Route element={<ModuleRoute module="collaborators"/>}>
            <Route path="/collaborators" element={<CollaboratorsPage/>}/>
          </Route>
          <Route path="/profile" element={<ProfilePage/>}/>
          <Route path="/search" element={<SearchPage/>}/>
          <Route path="/quick-create" element={<Navigate to="/people?create=1" replace/>}/>
          <Route path="/notifications" element={<NotificationsPage/>}/>
          <Route path="/more" element={<MorePage/>}/>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage/>}/>
    </Routes>
  )
}
