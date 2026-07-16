import { Route, Routes } from 'react-router-dom'
import { ToastContainer } from './components/ToastContainer'
import { TransactionProvider } from './context/TransactionContext'
import { AiRootCauseAnalysis } from './pages/AiRootCauseAnalysis'
import { Dashboard } from './pages/Dashboard'
import { History } from './pages/History'
import { IncidentTimeline } from './pages/IncidentTimeline'
import { LedgerComparison } from './pages/LedgerComparison'
import { Menu } from './pages/Menu'
import { NetworkFailureInjection } from './pages/NetworkFailureInjection'
import { PaymentFlowSimulator } from './pages/PaymentFlowSimulator'
import { RetryScenario } from './pages/RetryScenario'
import { ScenarioComparison } from './pages/ScenarioComparison'

function App() {
  return (
    <TransactionProvider>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/scenario-comparison" element={<ScenarioComparison />} />
        <Route path="/payment-flow" element={<PaymentFlowSimulator />} />
        <Route path="/failure-injection" element={<NetworkFailureInjection />} />
        <Route path="/retry" element={<RetryScenario />} />
        <Route path="/incident-timeline" element={<IncidentTimeline />} />
        <Route path="/ledger-comparison" element={<LedgerComparison />} />
        <Route path="/ai-analysis" element={<AiRootCauseAnalysis />} />
      </Routes>
    </TransactionProvider>
  )
}

export default App
