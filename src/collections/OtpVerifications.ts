import { CollectionConfig } from 'payload'

export const OtpVerifications: CollectionConfig = {
  slug: 'otp-verifications',
  admin: {
    hidden: true, // Không cần hiện trên CMS dashboard
  },
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'phone',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'otpCode',
      type: 'text',
      required: true,
    },
    {
      name: 'purpose',
      type: 'select',
      options: [
        { label: 'Login', value: 'login' },
        { label: 'Register', value: 'register' },
      ],
      defaultValue: 'login',
    },
    {
      name: 'expiredAt',
      type: 'date',
      required: true,
    },
    {
      name: 'verifiedAt',
      type: 'date',
    },
  ],
}
