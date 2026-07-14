import { Header } from './components/Header'
import { TransactionProvider } from './context/TransactionContext'
import { PaymentFlowSimulator } from './pages/PaymentFlowSimulator'

function App() {
  return (
    <TransactionProvider>
      <div className="min-h-screen bg-slate-950">
        <Header />
        <PaymentFlowSimulator />
      </div>
    </TransactionProvider>
  )
}

export default App
