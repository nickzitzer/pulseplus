import Layout from '../components/Layout';
import Link from 'next/link';

function TermsOfService() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <div className="prose max-w-none">
          <p>Welcome to PulsePlus. By using our service, you agree to these terms.</p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4">1. Acceptance of Terms</h2>
          <p>By accessing or using the PulsePlus platform, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4">2. Use of Service</h2>
          <p>You agree to use PulsePlus only for lawful purposes and in accordance with these Terms of Service.</p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4">3. User Accounts</h2>
          <p>To access certain features of PulsePlus, you may be required to create an account. You are responsible for maintaining the confidentiality of your account information.</p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4">4. Privacy</h2>
          <p>Your use of PulsePlus is also governed by our Privacy Policy, which can be found [link to privacy policy].</p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4">5. Modifications to Service</h2>
          <p>We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice.</p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-4">6. Governing Law</h2>
          <p>These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.</p>
          
          <p className="mt-8">For any questions about these Terms of Service, please contact us at [contact email].</p>
        </div>
        <div className="mt-8">
          <Link href="/login">
            <p className="text-sky-400 hover:text-sky-800">Back to Login</p>
          </Link>
        </div>
      </div>
    </Layout>
  );
}

export default TermsOfService;