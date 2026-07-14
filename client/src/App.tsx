import { Route, Routes } from 'react-router-dom'
import { TransactionProvider } from './context/TransactionContext'
import { NetworkFailureInjection } from './pages/NetworkFailureInjection'
import { PaymentFlowSimulator } from './pages/PaymentFlowSimulator'
import { RetryScenario } from './pages/RetryScenario'

function App() {
  return (
    <TransactionProvider>
      <Routes>
        <Route path="/" element={<PaymentFlowSimulator />} />
        <Route path="/failure-injection" element={<NetworkFailureInjection />} />
        <Route path="/retry" element={<RetryScenario />} />
      </Routes>
    </TransactionProvider>
  )
}

export default App
