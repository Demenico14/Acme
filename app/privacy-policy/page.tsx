"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="bg-muted/50 p-4 rounded-lg mb-8">
              <p className="text-sm text-muted-foreground">
                <strong>Disclaimer:</strong> This is a template Privacy Policy document. Before using this for your
                business, please consult with a legal professional familiar with Zimbabwean law to ensure compliance
                with all applicable laws and regulations, including the Access to Information and Protection of Privacy
                Act (AIPPA) and any other relevant data protection laws in Zimbabwe.
              </p>
            </div>

            <h2>1. Introduction</h2>
            <p>
              This Privacy Policy describes how we collect, use, process, and disclose your information, including
              personal information, in conjunction with your access to and use of our Services.
            </p>

            <h2>2. Information We Collect</h2>
            <p>We collect several types of information from and about users of our Services, including:</p>
            <ul>
              <li>Personal identifiers such as name, email address, phone number, and address</li>
              <li>Account information such as username and password</li>
              <li>Usage data such as how you interact with our Services</li>
              <li>Device information such as IP address, browser type, and operating system</li>
              <li>Location information when you use our Services</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect about you for various purposes, including to:</p>
            <ul>
              <li>Provide, maintain, and improve our Services</li>
              <li>Process transactions and send related information</li>
              <li>Send administrative messages, updates, security alerts, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Prevent and address fraud, unauthorized use, and other illegal activities</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2>4. Information Sharing and Disclosure</h2>
            <p>We may share your information with:</p>
            <ul>
              <li>Service providers who perform services on our behalf</li>
              <li>Business partners with whom we jointly offer products or services</li>
              <li>Law enforcement or other third parties if required by law or to protect our rights</li>
              <li>In connection with a business transaction such as a merger, acquisition, or sale of assets</li>
            </ul>

            <h2>5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect the security of your personal
              information. However, please note that no method of transmission over the Internet or method of electronic
              storage is 100% secure.
            </p>

            <h2>6. Your Rights</h2>
            <p>
              Depending on your location and applicable laws, you may have certain rights regarding your personal
              information, including:
            </p>
            <ul>
              <li>The right to access your personal information</li>
              <li>The right to correct inaccurate or incomplete information</li>
              <li>The right to delete your personal information</li>
              <li>The right to restrict or object to processing of your personal information</li>
              <li>The right to data portability</li>
            </ul>

            <h2>7. Children&apos;s Privacy</h2>
            <p>
              Our Services are not intended for children under the age of 13, and we do not knowingly collect personal
              information from children under 13.
            </p>

            <h2>8. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
              Privacy Policy on this page and updating the &quot;Last Updated&quot; date.
            </p>

            <h2>9. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at [your contact information].</p>

            <p className="text-sm text-muted-foreground mt-8">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}