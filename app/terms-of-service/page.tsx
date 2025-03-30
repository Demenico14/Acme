"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"

export default function TermsOfServicePage() {
  return (
    <div className="min-h-svh bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          <ThemeToggle />
        </div>

        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="bg-muted/50 p-4 rounded-lg mb-8">
              <p className="text-sm text-muted-foreground">
                <strong>Disclaimer:</strong> This is a template Terms of Service document. Before using this for your
                business, please consult with a legal professional familiar with Zimbabwean law to ensure compliance
                with all applicable laws and regulations.
              </p>
            </div>

            <h2>1. Introduction</h2>
            <p>
              Welcome to our platform. These Terms of Service (&quot;Terms&quot;) govern your access to and use of our website,
              services, and applications (collectively, the &quot;Services&quot;). By accessing or using our Services, you agree
              to be bound by these Terms and our Privacy Policy.
            </p>

            <h2>2. Definitions</h2>
            <p>
              &quot;User,&quot; &quot;You,&quot; and &quot;Your&quot; refer to the individual or entity accessing or using the Services. &quot;We,&quot;
              &quot;Us,&quot; and &quot;Our&quot; refer to the company operating the Services. &quot;Content&quot; refers to any information, text,
              graphics, photos, or other materials uploaded, downloaded, or appearing on the Services.
            </p>

            <h2>3. Account Registration</h2>
            <p>
              To access certain features of the Services, you may be required to register for an account. You agree to
              provide accurate, current, and complete information during the registration process and to update such
              information to keep it accurate, current, and complete.
            </p>

            <h2>4. User Conduct</h2>
            <p>You agree not to engage in any of the following prohibited activities:</p>
            <ul>
              <li>Violating any laws in Zimbabwe or your local jurisdiction</li>
              <li>Infringing on the intellectual property rights of others</li>
              <li>Uploading or transmitting viruses or malicious code</li>
              <li>
                Attempting to interfere with, compromise the system integrity or security, or decipher any transmissions
                to or from the servers running the Services
              </li>
              <li>
                Taking any action that imposes an unreasonable or disproportionately large load on our infrastructure
              </li>
            </ul>

            <h2>5. Intellectual Property</h2>
            <p>
              The Services and its original content, features, and functionality are owned by us and are protected by
              international copyright, trademark, patent, trade secret, and other intellectual property or proprietary
              rights laws.
            </p>

            <h2>6. Termination</h2>
            <p>
              We may terminate or suspend your account and bar access to the Services immediately, without prior notice
              or liability, under our sole discretion, for any reason whatsoever and without limitation, including but
              not limited to a breach of the Terms.
            </p>

            <h2>7. Limitation of Liability</h2>
            <p>
              In no event shall we be liable for any indirect, incidental, special, consequential, or punitive damages,
              including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting
              from:
            </p>
            <ul>
              <li>Your access to or use of or inability to access or use the Services</li>
              <li>Any conduct or content of any third party on the Services</li>
              <li>Any content obtained from the Services</li>
              <li>Unauthorized access, use, or alteration of your transmissions or content</li>
            </ul>

            <h2>8. Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of Zimbabwe, without regard to its
              conflict of law provisions.
            </p>

            <h2>9. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision
              is material, we will provide at least 30 days&apos; notice prior to any new terms taking effect.
            </p>

            <h2>10. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at [your contact information].</p>

            <p className="text-sm text-muted-foreground mt-8">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}