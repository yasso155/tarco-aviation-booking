/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component, useCallback } from 'react';
import { Application } from '@splinetool/runtime';
import {
  Plane,
  MapPin,
  Calendar,
  Users,
  ArrowRightLeft,
  User,
  UserRound,
  Baby,
  ChevronRight,
  Check,
  Star,
  ShieldCheck,
  Wifi,
  Coffee,
  Armchair,
  X,
  QrCode,
  Download,
  Wallet,
  ChevronDown,
  Globe,
  TrendingUp,
  Clock,
  Zap,
  Search,
  Menu,
  ExternalLink,
  ChevronLeft,
  Mail,
  Phone,
  Plus,
  Minus,
  Ticket,
  Briefcase,
  Sofa
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, signIn, logout } from './firebase';
import {
  collection,
  onSnapshot,
  getDocFromServer,
  doc
} from 'firebase/firestore';
import { HeroDatePicker } from './components/HeroDatePicker';
import { InlineCalendar } from './components/InlineCalendar';
import { StartupLoader } from './components/StartupLoader';
import { StepTransition } from './components/StepTransition';



enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Types ---
type Step = 'search' | 'results' | 'passengers' | 'services' | 'seats' | 'success';
type Lang = 'en' | 'ar';

interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

interface PassengerInfo {
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  gender: string;
  type: 'adult' | 'child' | 'infant';
}

interface ExtraService {
  id: string;
  name: string;
  price: number;
  icon: any;
  description: string;
}

interface FareFeature {
  key: string;
}

interface Fare {
  id: string;
  name: string;
  price: number;
  features: FareFeature[];
  recommended?: boolean;
}

interface Seat {
  id: string;
  type: 'available' | 'occupied' | 'selected';
  price: number;
  label: string;
}

// --- Constants ---
const FARES: Fare[] = [
  {
    id: 'lite',
    name: 'Economy Class',
    price: 189,
    features: [
      { key: 'handBag' },
      { key: 'seat' },
      { key: 'refundable' },
    ],
  },
  {
    id: 'semi',
    name: 'Economy Plus',
    price: 249,
    features: [
      { key: 'checkedBag' },
      { key: 'seat' },
      { key: 'priority' },
    ],
    recommended: true,
  },
  {
    id: 'business',
    name: 'Business Class',
    price: 499,
    features: [
      { key: 'checkedBags' },
      { key: 'lieFlat' },
      { key: 'gourmet' },
      { key: 'lounge' },
      { key: 'refundable' },
    ],
  },
];

const EXTRA_SERVICES: ExtraService[] = [
  { id: 'baggage', name: 'Buy Extra Weight', price: 45, icon: Briefcase, description: 'Pre-purchase additional baggage weight for your journey.' },
  { id: 'meal', name: 'Premium Meal', price: 15, icon: Coffee, description: 'Select from our gourmet Pearl menu options.' },
  { id: 'lounge', name: 'Tarco Pearl Lounge', price: 35, icon: Sofa, description: 'Enjoy exclusive comfort at our Pearl Lounge before departure.' },
  { id: 'wifi', name: 'In-flight Wi-Fi', price: 10, icon: Wifi, description: 'Stay connected throughout your flight.' },
];

interface Destination {
  id: string;
  code: string;
  price: number;
  image: string;
  tagKey: 'booked' | 'value' | 'core' | 'active' | 'popular';
  name: {
    en: string;
    ar: string;
  };
  country: {
    en: string;
    ar: string;
  };
}

const DESTINATIONS: Destination[] = [
  { id: 'khartoum', code: 'KRT', price: 250, image: '/Images/crew_photo.jpg', tagKey: 'core', name: { en: 'Khartoum', ar: 'الخرطوم' }, country: { en: 'Sudan', ar: 'السودان' } },
  { id: 'portsudan', code: 'PZU', price: 220, image: '/Images/dest_portsudan.jpg', tagKey: 'active', name: { en: 'Port Sudan', ar: 'بورتسودان' }, country: { en: 'Sudan', ar: 'السودان' } },
  { id: 'dubai', code: 'DXB', price: 380, image: '/Images/dest_dubai.jpg', tagKey: 'popular', name: { en: 'Dubai', ar: 'دبي' }, country: { en: 'UAE', ar: 'الإمارات' } },
  { id: 'sharjah', code: 'SHJ', price: 360, image: '/Images/dest_dubai.jpg', tagKey: 'value', name: { en: 'Sharjah', ar: 'الشارقة' }, country: { en: 'UAE', ar: 'الإمارات' } },
  { id: 'riyadh', code: 'RUH', price: 420, image: '/Images/dest_riyadh.jpg', tagKey: 'booked', name: { en: 'Riyadh', ar: 'الرياض' }, country: { en: 'Saudi Arabia', ar: 'السعودية' } },
  { id: 'jeddah', code: 'JED', price: 340, image: '/Images/dest_riyadh.jpg', tagKey: 'popular', name: { en: 'Jeddah', ar: 'جدة' }, country: { en: 'Saudi Arabia', ar: 'السعودية' } },
  { id: 'dammam', code: 'DMM', price: 390, image: '/Images/dest_riyadh.jpg', tagKey: 'value', name: { en: 'Dammam', ar: 'الدمام' }, country: { en: 'Saudi Arabia', ar: 'السعودية' } },
  { id: 'cairo', code: 'CAI', price: 290, image: '/Images/dest_cairo.jpg', tagKey: 'value', name: { en: 'Cairo', ar: 'القاهرة' }, country: { en: 'Egypt', ar: 'مصر' } },
  { id: 'doha', code: 'DOH', price: 410, image: '/Images/dest_doha.jpg', tagKey: 'popular', name: { en: 'Doha', ar: 'الدوحة' }, country: { en: 'Qatar', ar: 'قطر' } },
  { id: 'asmara', code: 'ASM', price: 280, image: '/Images/dest_asmara.jpg', tagKey: 'value', name: { en: 'Asmara', ar: 'أسمرا' }, country: { en: 'Eritrea', ar: 'إريتريا' } },
  { id: 'addis', code: 'ADD', price: 310, image: '/Images/dest_addis.jpg', tagKey: 'popular', name: { en: 'Addis Ababa', ar: 'أديس أبابا' }, country: { en: 'Ethiopia', ar: 'إثيوبيا' } },
  { id: 'entebbe', code: 'EBB', price: 330, image: '/Images/dest_entebbe.jpg', tagKey: 'value', name: { en: 'Entebbe', ar: 'عنتيبي' }, country: { en: 'Uganda', ar: 'أوغندا' } },
  { id: 'muscat', code: 'MCT', price: 400, image: '/Images/dest_muscat.jpg', tagKey: 'value', name: { en: 'Muscat', ar: 'مسقط' }, country: { en: 'Oman', ar: 'عمان' } },
  { id: 'juba', code: 'JUB', price: 270, image: '/Images/crew_photo.jpg', tagKey: 'value', name: { en: 'Juba', ar: 'جوبا' }, country: { en: 'South Sudan', ar: 'جنوب السودان' } },
  { id: 'kuwait', code: 'KWI', price: 430, image: '/Images/dest_doha.jpg', tagKey: 'value', name: { en: 'Kuwait City', ar: 'مدينة الكويت' }, country: { en: 'Kuwait', ar: 'الكويت' } },
];

const TRANSLATIONS = {
  en: {
    dir: 'ltr',
    font: 'font-sans',
    brand: { first: 'TARCO', second: 'AVIATION' },
    slogan: 'The Legend of Africa',
    motto: 'Safety and Smiles',
    nav: {
      book: 'Book',
      checkin: 'Check-in',
      manage: 'Manage',
      status: 'Status',
      login: 'Login',
      point3: 'Modern Fleet'
    },
    contacts: {
      headOffice: 'Head Office (Khartoum)',
      madaniOffice: 'Madani Office',
      headAddress: 'Omack Street, Khartoum',
      madaniAddress: 'Shikan Tower, Al-Masah Street'
    },
    steps: {
      search: 'Search',
      results: 'Fares',
      passengers: 'Passengers',
      services: 'Services',
      seats: 'Seats',
      success: 'Confirm'
    },
    booking: {
      roundTrip: 'Round Trip',
      oneWay: 'One Way',
      multiCity: 'Multi-city',
      adults: 'Adults',
      children: 'Children',
      infants: 'Infants',
      from: 'From',
      to: 'To',
      date: 'Date',
      departure: 'Departure',
      return: 'Return',
      flexibleDates: 'My dates are flexible',
      clearAll: 'Clear all',
      continueTo: 'Continue',
      promo: 'Promo Code',
      search: 'Search Flights',
      manage: 'Manage Booking',
      checkin: 'Check-in',
      pnr: 'Booking Reference (PNR)',
      lastName: 'Last Name',
      retrieve: 'Retrieve Booking',
      ticket: 'Ticket Number / PNR',
      online: 'Online Check-in'
    },
    results: {
      title: 'Select Your Fare',
      departing: 'Departing',
      popular: 'Most Popular',
      selected: 'Selected',
      select: 'Select Fare',
      back: 'Back to Search',
      continue: 'Continue to Services'
    },
    passengersDetails: {
      title: 'Passenger Details',
      subtitle: 'Please enter passenger names and passport details exactly as they appear in their travel documents.',
      passengerNum: 'Passenger {num}',
      leadPassenger: 'Lead Passenger',
      adult: 'Adult',
      child: 'Child',
      infant: 'Infant',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      titleLabel: 'Title',
      firstName: 'First Name',
      lastName: 'Last Name',
      dob: 'Date of Birth',
      nationality: 'Nationality',
      passportNumber: 'Passport Number',
      passportExpiry: 'Passport Expiry Date',
      contactInfo: 'Contact Information',
      email: 'Email Address',
      phone: 'Phone Number',
      continue: 'Continue to Services',
      back: 'Back to Fares'
    },
    services: {
      title: 'Enhance Your Experience',
      subtitle: 'Add extra services to make your journey more comfortable.',
      total: 'Services Total',
      back: 'Back to Fares',
      continue: 'Continue to Seats'
    },
    seats: {
      title: 'Choose Your Seat',
      subtitle: 'Select your preferred spot for the 4h 20m journey.',
      deck: 'Flight Deck',
      summary: 'Booking Summary',
      fare: 'Fare',
      extra: 'Extra Services',
      seat: 'Seat',
      total: 'Total',
      secure: 'Secure Booking Guaranteed',
      confirm: 'Confirm Selection'
    },
    success: {
      title: 'Booking Confirmed!',
      subtitle: 'Your adventure to {to} begins on April 14th.',
      boarding: 'Digital Boarding Pass',
      gate: 'Gate',
      boardingTime: 'Boarding',
      seat: 'Seat',
      class: 'Class',
      passenger: 'Passenger',
      flight: 'Flight',
      wallet: 'Add to Wallet',
      bookAnother: 'Book Another Flight'
    },
    upgrade: {
      title: 'Elevate Your Journey',
      subtitle: 'Limited Offer',
      desc: 'Upgrade to Business Class for only $150 more and enjoy premium comfort, gourmet meals, and lounge access.',
      button: 'Upgrade Now',
      no: 'No thanks, continue'
    },
    fares: {
      lite: 'Guest Basic',
      semi: 'Guest Semi-Flex',
      business: 'Business Flex'
    },
    serviceItems: {
      baggage: { name: 'Extra Baggage', desc: 'Add an extra 23kg piece of luggage.' },
      meal: { name: 'Premium Meal', desc: 'Upgrade to a gourmet hot meal selection.' },
      lounge: { name: 'Lounge Access', desc: 'Relax in the Tarco Pearl Lounge before your flight.' },
      wifi: { name: 'In-flight Wi-Fi', desc: 'Stay connected with high-speed internet.' }
    },
    features: {
      handBag: { label: '7kg Hand Baggage', desc: 'Carry one small bag into the cabin.' },
      checkedBag: { label: '23kg Checked Bag', desc: 'Standard baggage allowance for your trip.' },
      checkedBags: { label: '2x 32kg Checked Bags', desc: 'Generous baggage allowance for all your needs.' },
      meal: { label: 'Standard Meal', desc: 'Complimentary snack and beverage service.' },
      hotMeal: { label: 'Hot Meal', desc: 'Delicious hot meal served during your flight.' },
      gourmet: { label: 'Gourmet Meals', desc: 'Exquisite multi-course dining prepared by top chefs.' },
      seat: { label: 'Standard Seat', desc: 'Comfortable seat with standard legroom.' },
      extraLeg: { label: 'Extra Legroom', desc: 'More space to stretch your legs during the flight.' },
      lieFlat: { label: 'Lie-flat Seat', desc: 'Convert your seat into a fully flat bed for maximum rest.' },
      lounge: { label: 'Lounge Access', desc: 'Relax in our exclusive airport lounges before departure.' },
      refundable: { label: 'Fully Refundable', desc: 'Cancel your trip at any time for a full refund.' },
      priority: { label: 'Priority Boarding', desc: 'Get on the plane first and settle in early.' }
    },
    destinations: {
      title: 'Popular Destinations',
      addis: 'Addis Ababa',
      riyadh: 'Riyadh',
      cairo: 'Cairo',
      asmara: 'Asmara',
      starting: 'Starting from',
      bookNow: 'Book Now'
    },
    utility: {
      country: 'Country / Language',
      currency: 'Currency: USD',
      support: 'Support',
      pearl: 'Tarco Pearl'
    },
    search: {
      overlayTitle: 'Search Tarco Aviation',
      overlaySubtitle: 'Find flights, destinations, and travel information.',
      placeholder: 'Where would you like to go?',
      categories: {
        destinations: 'Popular Destinations',
        status: 'Flight Status',
        requirements: 'Travel Requirements'
      }
    },
    stats: {
      flights: 'Flights Today',
      destinations: 'Destinations',
      passengers: 'Passengers Served',
      rate: 'On-Time Rate'
    },
    hero: {
      title: 'Welcome with peace.',
      suffix: 'Travel',
      highlight: 'Safety',
      subtitle: 'Connecting Sudan to the world with our modern B737-800NG fleet and world-class Sudanese hospitality.',
      cta: 'Start planning',
      bookNow: 'Book Now'
    },
    navMenu: {
      travel: {
        label: 'Travel',
        items: {
          book: { name: 'Book a Flight', desc: 'Plan your next adventure with our global network.' },
          status: { name: 'Flight Status', desc: 'Real-time updates on departures and arrivals.' },
          destinations: { name: 'Destinations', desc: 'Explore where we fly across Africa and the Middle East.' },
          schedule: { name: 'Flight Schedule', desc: 'View our seasonal flight operations and timings.' }
        }
      },
      manage: {
        label: 'Manage',
        items: {
          checkin: { name: 'Check-in', desc: 'Speed up your journey with online check-in.' },
          trips: { name: 'My Trips', desc: 'View, modify, or upgrade your existing bookings.' },
          baggage: { name: 'Extra Baggage', desc: 'Pre-book additional baggage at discounted rates.' },
          refund: { name: 'Refund Request', desc: 'Submit and track your ticket refund requests.' }
        }
      },
      experience: {
        label: 'Experience',
        items: {
          lounge: { name: 'Pearl Lounge', desc: 'Relax in comfort at our exclusive airport lounges.' },
          fleet: { name: 'Fleet', desc: 'Learn about our modern B737-800NG aircraft.' },
          cabins: { name: 'Cabins', desc: 'Discover our Business and Economy Class services.' },
          dining: { name: 'In-flight Dining', desc: 'Taste the best of Sudanese hospitality in the sky.' }
        }
      },
      support: {
        label: 'Support',
        items: {
          contact: { name: 'Contact Us', desc: 'Get in touch with our local offices worldwide.' },
          faqs: { name: 'FAQs', desc: 'Find quick answers to common travel questions.' },
          visa: { name: 'Travel Requirements', desc: 'Essential info on visas, health, and documents.' },
          center: { name: 'Help Center', desc: 'Comprehensive support for your entire journey.' }
        }
      }
    },
    journey: {
      title: 'Complete Your Journey',
      seats: { title: 'Seat Selection', desc: 'Pre-book your favorite window or aisle seat.' },
      weight: { title: 'Buy Weight', desc: 'Avoid over-weight charges by pre-booking baggage.' },
      guidance: { title: 'Travel Guidance', desc: 'Up-to-date entry requirements and travel help.' },
      manage: { title: 'Manage Booking', desc: 'Easy online modifications to your travel itinerary.' },
      learn: 'Learn More'
    },
    destTags: {
      booked: 'Most Booked',
      value: 'Best Value',
      core: 'Core Hub',
      active: 'Active Hub',
      popular: 'Popular'
    },
    excellence: {
      title: 'Excellence in Service',
      subtitle: 'Award-winning Sudanese hospitality',
      desc: 'Connecting Sudan to the world with our modern B737-800NG fleet and world-class Sudanese hospitality.',
      point1: 'Safety and Comfort First',
      point2: 'Professional Cabin Crew',
      point3: 'Modern Fleet'
    }
  },

  ar: {
    dir: 'rtl',
    font: 'font-arabic',
    brand: { first: 'تاركو', second: 'للطيران' },
    slogan: 'أسطورة أفريقيا',
    motto: 'سلام وابتسام',
    utility: {
      country: 'الدولة / اللغة',
      currency: 'العملة: دولار',
      support: 'الدعم',
      pearl: 'تاركو بيرل'
    },
    search: {
      overlayTitle: 'البحث في تاركو للطيران',
      overlaySubtitle: 'ابحث عن الرحلات والوجهات ومعلومات السفر.',
      placeholder: 'إلى أين تود الذهاب؟',
      categories: {
        destinations: 'وجهات شعبية',
        status: 'حالة الرحلة',
        requirements: 'متطلبات السفر'
      }
    },
    stats: {
      flights: 'رحلات اليوم',
      destinations: 'وجهة',
      passengers: 'مسافر تم خدمتهم',
      rate: 'نسبة الدقة'
    },
    hero: {
      title: 'ترحابكم سلام',
      suffix: 'و وجهاتكم',
      highlight: 'سلامة',
      subtitle: 'نربط السودان بالعالم مع أسطولنا الحديث B737-800NG وكرم الضيافة السوداني العالمي.',
      cta: 'ابدأ التخطيط',
      bookNow: 'احجز الآن'
    },
    navMenu: {
      travel: {
        label: 'السفر',
        items: {
          book: { name: 'حجز رحلة', desc: 'خطط لمغامرتك التالية مع شبكتنا العالمية.' },
          status: { name: 'حالة الرحلة', desc: 'تحديثات في الوقت الفعلي للمغادرة والوصول.' },
          destinations: { name: 'الوجهات', desc: 'استكشف أين نطير عبر أفريقيا والشرق الأوسط.' },
          schedule: { name: 'جدول الرحلات', desc: 'عرض عمليات الرحلات الموسمية والتوقيتات.' }
        }
      },
      manage: {
        label: 'الإدارة',
        items: {
          checkin: { name: 'إنهاء الإجراءات', desc: 'سرع رحلتك مع إنهاء الإجراءات عبر الإنترنت.' },
          trips: { name: 'رحلاتي', desc: 'عرض أو تعديل أو ترقية حجوزاتك الحالية.' },
          baggage: { name: 'وزن إضافي', desc: 'احجز وزناً إضافياً مسبقاً بأسعار مخفضة.' },
          refund: { name: 'طلب استرداد', desc: 'قدم وتتبع طلبات استرداد ثمن التذكرة.' }
        }
      },
      experience: {
        label: 'التجربة',
        items: {
          lounge: { name: 'صالة بيرل', desc: 'استرخ في راحة في صالات المطار الحصرية لدينا.' },
          fleet: { name: 'الأسطول', desc: 'تعرف على طائراتنا الحديثة B737-800NG.' },
          cabins: { name: 'المقصورات', desc: 'اكتشف خدماتنا في درجة الأعمال والضيافة.' },
          dining: { name: 'الطعام على متن الطائرة', desc: 'تذوق أفضل ما في الضيافة السودانية في السماء.' }
        }
      },
      support: {
        label: 'الدعم',
        items: {
          contact: { name: 'اتصل بنا', desc: 'تواصل مع مكاتبنا المحلية في جميع أنحاء العالم.' },
          faqs: { name: 'الأسئلة الشائعة', desc: 'ابحث عن إجابات سريعة لأسئلة السفر الشائعة.' },
          visa: { name: 'متطلبات السفر', desc: 'معلومات أساسية عن التأشيرات والصحة والمستندات.' },
          center: { name: 'مركز المساعدة', desc: 'دعم شامل لرحلتك بأكملها.' }
        }
      }
    },
    nav: {
      book: 'احجز',
      checkin: 'إنهاء إجراءات السفر',
      manage: 'إدارة الحجز',
      status: 'حالة الرحلة',
      login: 'دخول'
    },
    steps: {
      search: 'البحث',
      results: 'الأسعار',
      passengers: 'المسافرين',
      services: 'الخدمات',
      seats: 'المقاعد',
      success: 'تأكيد'
    },
    heroAlt: {
      title: 'حلق فوق',
      accent: 'التوقعات',
      subtitle: 'استمتع بدفء الضيافة السودانية مع خدمة عالمية المستوى.'
    },
    booking: {
      roundTrip: 'ذهاب وعودة',
      oneWay: 'ذهاب فقط',
      multiCity: 'وجهات متعددة',
      adults: 'بالغون',
      children: 'أطفال',
      infants: 'رضع',
      from: 'من',
      to: 'إلى',
      date: 'التاريخ',
      departure: 'المغادرة',
      return: 'العودة',
      flexibleDates: 'مواعيدي مرنة',
      clearAll: 'مسح الكل',
      continueTo: 'متابعة',
      promo: 'رمز ترويجي',
      search: 'بحث عن رحلات',
      manage: 'إدارة الحجز',
      checkin: 'إنهاء إجراءات السفر',
      pnr: 'مرجع الحجز (PNR)',
      lastName: 'الاسم الأخير',
      retrieve: 'استرجاع الحجز',
      ticket: 'رقم التذكرة / PNR',
      online: 'إنهاء الإجراءات عبر الإنترنت'
    },
    results: {
      title: 'اختر السعر',
      departing: 'المغادرة',
      popular: 'الأكثر شعبية',
      selected: 'تم الاختيار',
      select: 'اختر السعر',
      back: 'العودة للبحث',
      continue: 'المتابعة للخدمات'
    },
    passengersDetails: {
      title: 'بيانات المسافرين',
      subtitle: 'يرجى إدخال أسماء المسافرين وتفاصيل جوازات السفر الخاصة بهم تماماً كما تظهر في وثائق السفر.',
      passengerNum: 'المسافر {num}',
      leadPassenger: 'المسافر الرئيسي',
      adult: 'بالغ',
      child: 'طفل',
      infant: 'رضيع',
      gender: 'الجنس',
      male: 'ذكر',
      female: 'أنثى',
      titleLabel: 'اللقب',
      firstName: 'الاسم الأول',
      lastName: 'الاسم الأخير',
      dob: 'تاريخ الميلاد',
      nationality: 'الجنسية',
      passportNumber: 'رقم جواز السفر',
      passportExpiry: 'تاريخ انتهاء الجواز',
      contactInfo: 'معلومات الاتصال',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      continue: 'المتابعة للخدمات',
      back: 'العودة للأسعار'
    },
    services: {
      title: 'عزز تجربتك',
      subtitle: 'أضف خدمات إضافية لجعل رحلتك أكثر راحة.',
      total: 'إجمالي الخدمات',
      back: 'العودة للأسعار',
      continue: 'المتابعة للمقاعد'
    },
    seats: {
      title: 'اختر مقعدك',
      subtitle: 'اختر مكانك المفضل لرحلة مدتها 4 ساعات و 20 دقيقة.',
      deck: 'قمرة القيادة',
      summary: 'ملخص الحجز',
      fare: 'السعر',
      extra: 'خدمات إضافية',
      seat: 'المقعد',
      total: 'الإجمالي',
      secure: 'حجز آمن مضمون',
      confirm: 'تأكيد الاختيار'
    },
    success: {
      title: 'تم تأكيد الحجز!',
      subtitle: 'تبدأ مغامرتك إلى {to} في 14 أبريل.',
      boarding: 'بطاقة صعود رقمية',
      gate: 'البوابة',
      boardingTime: 'الصعود',
      seat: 'المقعد',
      class: 'الدرجة',
      passenger: 'المسافر',
      flight: 'الرحلة',
      wallet: 'إضافة إلى المحفظة',
      bookAnother: 'حجز رحلة أخرى'
    },
    journey: {
      title: 'أكمل رحلتك',
      seats: { title: 'اختيار المقاعد', desc: 'اختر مكانك المفضل على الطائرة.' },
      weight: { title: 'شراء وزن زائد', desc: 'احجز وزناً إضافياً مسبقاً بأسعار مخفضة.' },
      guidance: { title: 'إرشادات السفر', desc: 'معلومات أساسية لوجهتك.' },
      manage: { title: 'إدارة الحجز', desc: 'تعديل أو ترقية رحلتك بسهولة.' },
      learn: 'تعرف على المزيد'
    },
    upgrade: {
      title: 'ارتقِ برحلتك',
      subtitle: 'عرض محدود',
      desc: 'قم بالترقية إلى درجة الأعمال مقابل 150 دولاراً إضافياً فقط واستمتع براحة مميزة ووجبات فاخرة ودخول إلى الصالة.',
      button: 'ترقية الآن',
      no: 'لا شكراً، متابعة'
    },
    fares: {
      lite: 'الضيافة الأساسية',
      semi: 'الضيافة المرنة',
      business: 'درجة الأعمال'
    },
    serviceItems: {
      baggage: { name: 'وزن إضافي', desc: 'أضف قطعة أمتعة إضافية بوزن 23 كجم.' },
      meal: { name: 'وجبة مميزة', desc: 'قم بالترقية إلى مجموعة مختارة من الوجبات الساخنة الفاخرة.' },
      lounge: { name: 'دخول الصالة', desc: 'استرخ في صالة تاركو بيرل قبل رحلتك.' },
      wifi: { name: 'إنتنرت على الطائرة', desc: 'ابق على اتصال بإنترنت عالي السرعة.' }
    },
    features: {
      handBag: { label: 'حقيبة يد 7 كجم', desc: 'احمل حقيبة صغيرة واحدة معك في الكابينة.' },
      checkedBag: { label: 'حقيبة مسجلة 23 كجم', desc: 'وزن الأمتعة القياسي لرحلتك.' },
      checkedBags: { label: 'حقيبتان 32 كجم', desc: 'وزن أمتعة سخي لجميع احتياجاتك.' },
      meal: { label: 'وجبة قياسية', desc: 'خدمة وجبات خفيفة ومشروبات مجانية.' },
      hotMeal: { label: 'وجبة ساخنة', desc: 'وجبة ساخنة لذيذة تقدم أثناء رحلتك.' },
      gourmet: { label: 'وجبات فاخرة', desc: 'عشاء فاخر من عدة أطباق يعده كبار الطهاة.' },
      seat: { label: 'مقعد قياسي', desc: 'مقعد مريح بمساحة أرجل قياسية.' },
      extraLeg: { label: 'مساحة أرجل إضافية', desc: 'مساحة أكبر لتمديد ساقيك أثناء الرحلة.' },
      lieFlat: { label: 'مقعد يتحول لسرير', desc: 'حول مقعدك إلى سرير مسطح تماماً لأقصى درجات الراحة.' },
      lounge: { label: 'دخول الصالة', desc: 'استرخ في صالات المطار الحصرية لدينا قبل المغادرة.' },
      refundable: { label: 'مسترد بالكامل', desc: 'إلغاء رحلتك في أي وقت واسترداد كامل المبلغ.' },
      priority: { label: 'أولوية الصعود', desc: 'اصعد إلى الطائرة أولاً واستقر مبكراً.' }
    },
    destinations: {
      title: 'وجهات شعبية',
      addis: 'أديس أبابا',
      riyadh: 'الرياض',
      cairo: 'القاهرة',
      asmara: 'أسمرا',
      starting: 'تبدأ من',
      bookNow: 'احجز الآن'
    },
    destTags: {
      booked: 'الأكثر حجزاً',
      value: 'أفضل قيمة',
      core: 'مركز أساسي',
      active: 'مركز نشط',
      popular: 'شائع'
    },
    excellence: {
      title: 'التميز في الخدمة',
      subtitle: 'ضيافة سودانية حائزة على جوائز',
      desc: 'نربط السودان بالعالم مع أسطولنا الحديث B737-800NG وكرم الضيافة السوداني العالمي.',
      point1: 'السلامة والراحة أولاً',
      point2: 'طاقم ضيافة محترف',
      point3: 'أسطول حديث'
    },
    contacts: {
      headOffice: 'المكتب الرئيسي (الخرطوم)',
      madaniOffice: 'مكتب مدني',
      headAddress: 'شارع أوماك، الخرطوم',
      madaniAddress: 'برج شيكان، شارع الماسه'
    }
  }
};



const SEATS: Seat[][] = Array.from({ length: 10 }, (_, row) =>
  ['A', 'B', 'C', 'D', 'E', 'F'].map((col) => ({
    id: `${row + 1}${col}`,
    type: Math.random() > 0.8 ? 'occupied' : 'available',
    price: col === 'A' || col === 'F' ? 20 : 0,
    label: `${row + 1}${col}`,
  }))
);

// --- Components ---
const SafeImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}> = ({ src, alt, className, fallbackSrc, referrerPolicy = "no-referrer" }) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
    setStatus('loading');
  }, [src]);

  const handleError = () => {
    if (status === 'error') return; // Prevent infinite loop
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    } else {
      setStatus('error');
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {status === 'loading' && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
          <Plane className="text-slate-300 animate-bounce" size={24} />
        </div>
      )}

      {status === 'error' ? (
        <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
          <MapPin size={32} className="mb-2 opacity-20" />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Image Unavailable</span>
        </div>
      ) : (
        <img
          src={currentSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setStatus('loaded')}
          onError={handleError}
          referrerPolicy={referrerPolicy}
        />
      )}
    </div>
  );
};

const FeatureItem: React.FC<{ feature: FareFeature; lang: Lang }> = ({ feature, lang }) => {
  const [isHovered, setIsHovered] = useState(false);
  const t = TRANSLATIONS[lang];
  const featureData = t.features[feature.key as keyof typeof t.features];

  const getFeatureIcon = (key: string) => {
    switch (key) {
      case 'handBag':
        return <Briefcase size={16} className="text-tarco-blue flex-shrink-0" />;
      case 'checkedBag':
      case 'checkedBags':
        return <Briefcase size={16} className="text-tarco-navy flex-shrink-0" />;
      case 'meal':
      case 'hotMeal':
      case 'gourmet':
        return <Coffee size={16} className="text-amber-600 flex-shrink-0" />;
      case 'seat':
      case 'extraLeg':
      case 'lieFlat':
        return <Armchair size={16} className="text-indigo-600 flex-shrink-0" />;
      case 'lounge':
        return <Sofa size={16} className="text-tarco-red flex-shrink-0" />;
      case 'refundable':
        return <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />;
      case 'priority':
        return <Star size={16} className="text-tarco-red flex-shrink-0" />;
      default:
        return <Check size={16} className="text-emerald-500 flex-shrink-0" />;
    }
  };

  return (
    <li
      className="relative flex items-center gap-3 text-sm text-slate-600 cursor-help"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {getFeatureIcon(feature.key)}
      <span>{featureData?.label || feature.key}</span>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className={`absolute bottom-full mb-3 w-56 p-4 bg-tarco-blue text-white text-[11px] rounded-2xl shadow-2xl z-50 leading-relaxed font-medium ${lang === 'ar' ? 'right-0' : 'left-0'}`}
          >
            {featureData?.desc}
            <div className={`absolute top-full border-[6px] border-transparent border-t-tarco-blue ${lang === 'ar' ? 'right-4' : 'left-4'}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
};

interface FareCardProps {
  fare: Fare;
  dynamicPrice: number;
  isSelected: boolean;
  lang: Lang;
  onClick: () => void;
  t: any;
  formatPrice: (price: number) => string;
  delayIndex: number;
}

const FareCard: React.FC<FareCardProps> = ({
  fare,
  dynamicPrice,
  isSelected,
  lang,
  onClick,
  t,
  formatPrice,
  delayIndex
}) => {
  return (
    <motion.div
      key={fare.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: delayIndex * 0.06, ease: [0.23, 1, 0.32, 1] }}
      onClick={onClick}
      className={`fare-card relative cursor-pointer rounded-[2rem] overflow-hidden border-2 flex flex-col justify-between transition-all ${
        isSelected
          ? 'border-tarco-navy bg-white shadow-2xl scale-[1.02]'
          : fare.recommended
            ? 'border-tarco-red bg-white shadow-xl scale-[1.01]'
            : 'border-slate-100 bg-white'
      }`}
    >
      {fare.recommended && (
        <div className="absolute top-2 right-4 bg-white/20 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md">
          {t.results.popular}
        </div>
      )}
      
      {/* Header block with distinct color for each fare class */}
      <div className={`py-5 px-6 text-white text-center font-extrabold text-base tracking-wide flex flex-col justify-center items-center ${
        fare.id === 'lite'
          ? 'bg-tarco-blue'
          : fare.id === 'semi'
            ? 'bg-tarco-navy'
            : 'bg-tarco-red'
      }`}>
        <span>
          {fare.id === 'lite' ? t.fares.lite : fare.id === 'semi' ? t.fares.semi : t.fares.business}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
        <ul className="space-y-4">
          {fare.features.map((feature, i) => (
            <FeatureItem key={i} feature={feature} lang={lang} />
          ))}
        </ul>

        <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
          {/* Radio Selection Indicator */}
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected ? 'border-tarco-blue bg-white' : 'border-slate-300 bg-white'
          }`}>
            {isSelected && (
              <div className="w-3 h-3 rounded-full bg-tarco-blue" />
            )}
          </div>

          {/* Price display */}
          <div className="text-right">
            <div className="text-2xl font-black text-tarco-navy">
              {formatPrice(dynamicPrice)}
            </div>
            {fare.id === 'business' && (
              <div className="text-[10px] text-tarco-red font-bold mt-0.5">
                {lang === 'en' ? 'only 8 seat(s) remaining' : 'متبقي 8 مقاعد فقط'}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const progress = Math.min((Date.now() - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);
  return { count, ref };
}

function StatCard({ stat, lang }: { stat: { label: string; value: number; suffix: string; icon: any }; lang: Lang; key?: any }) {
  const { count, ref } = useCountUp(stat.value);
  const display = stat.value >= 10000
    ? (count >= 1000 ? `${(count / 1000).toFixed(0)}K` : count.toString())
    : count.toString();
  return (
    <div ref={ref} className="flex flex-col items-center gap-1">
      <stat.icon size={18} className="text-tarco-red" />
      <span className="text-2xl font-black text-white tabular-nums">{display}{stat.suffix}</span>
      <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">{stat.label}</span>
    </div>
  );
}

// --- Main App ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bookingRef = useRef<HTMLDivElement>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const [showScrollCTA, setShowScrollCTA] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    // Only load the heavy 3D Spline scene on desktop viewports to optimize mobile load time and CPU/battery usage
    if (canvasRef.current && window.innerWidth >= 768) {
      const app = new Application(canvasRef.current);
      app.load('https://prod.spline.design/xK6dU3qCw-vltUIV/scene.splinecode');
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 20);
      setShowScrollCTA(window.scrollY > 120 && window.scrollY < 800);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [lang, setLang] = useState<Lang>('en');
  const t = TRANSLATIONS[lang];

  const navMenu = [
    {
      id: 'travel',
      label: t.navMenu.travel.label,
      items: [
        { name: t.navMenu.travel.items.book.name, icon: Plane, desc: t.navMenu.travel.items.book.desc },
        { name: t.navMenu.travel.items.status.name, icon: Clock, desc: t.navMenu.travel.items.status.desc },
        { name: t.navMenu.travel.items.destinations.name, icon: Globe, desc: t.navMenu.travel.items.destinations.desc },
        { name: t.navMenu.travel.items.schedule.name, icon: Calendar, desc: t.navMenu.travel.items.schedule.desc }
      ]
    },
    {
      id: 'manage',
      label: t.navMenu.manage.label,
      items: [
        { name: t.navMenu.manage.items.checkin.name, icon: ShieldCheck, desc: t.navMenu.manage.items.checkin.desc },
        { name: t.navMenu.manage.items.trips.name, icon: Wallet, desc: t.navMenu.manage.items.trips.desc },
        { name: t.navMenu.manage.items.baggage.name, icon: Download, desc: t.navMenu.manage.items.baggage.desc },
        { name: t.navMenu.manage.items.refund.name, icon: X, desc: t.navMenu.manage.items.refund.desc }
      ]
    },
    {
      id: 'experience',
      label: t.navMenu.experience.label,
      items: [
        { name: t.navMenu.experience.items.lounge.name, icon: Star, desc: t.navMenu.experience.items.lounge.desc },
        { name: t.navMenu.experience.items.fleet.name, icon: Plane, desc: t.navMenu.experience.items.fleet.desc },
        { name: t.navMenu.experience.items.cabins.name, icon: Armchair, desc: t.navMenu.experience.items.cabins.desc },
        { name: t.navMenu.experience.items.dining.name, icon: Coffee, desc: t.navMenu.experience.items.dining.desc }
      ]
    },
    {
      id: 'support',
      label: t.navMenu.support.label,
      items: [
        { name: t.navMenu.support.items.contact.name, icon: MapPin, desc: t.navMenu.support.items.contact.desc },
        { name: t.navMenu.support.items.faqs.name, icon: Zap, desc: t.navMenu.support.items.faqs.desc },
        { name: t.navMenu.support.items.visa.name, icon: ShieldCheck, desc: t.navMenu.support.items.visa.desc },
        { name: t.navMenu.support.items.center.name, icon: Users, desc: t.navMenu.support.items.center.desc }
      ]
    }
  ];

  const liveStats = [
    { label: t.stats.flights, value: 24, suffix: '', icon: Plane },
    { label: t.stats.destinations, value: 18, suffix: '+', icon: Globe },
    { label: t.stats.passengers, value: 980000, suffix: '+', icon: Users },
    { label: t.stats.rate, value: 94, suffix: '%', icon: TrendingUp },
  ];
  const [assets, setAssets] = useState<Record<string, string>>({});
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<Step>('search');
  const [isLoading, setIsLoading] = useState(false);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [nextStepId, setNextStepId] = useState<Step | null>(null);
  const [activeTab, setActiveTab] = useState<'booking' | 'manage' | 'checkin'>('booking');
  const [fromCityId, setFromCityId] = useState('khartoum');
  const [toCityId, setToCityId] = useState('dubai');
  const [activeDropdown, setActiveDropdown] = useState<'from' | 'to' | null>(null);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');

  const fromCity = DESTINATIONS.find(d => d.id === fromCityId) || DESTINATIONS[0];
  const toCity = DESTINATIONS.find(d => d.id === toCityId) || DESTINATIONS[2];
  const from = `${fromCity.name[lang]} (${fromCity.code})`;
  const to = `${toCity.name[lang]} (${toCity.code})`;

  const getFilteredDestinations = (searchQuery: string, excludeId?: string) => {
    const query = searchQuery.trim().toLowerCase();
    return DESTINATIONS.filter(dest => {
      if (dest.id === excludeId) return false;
      if (!query) return true;
      return (
        dest.name.en.toLowerCase().includes(query) ||
        dest.name.ar.includes(query) ||
        dest.code.toLowerCase().includes(query) ||
        dest.country.en.toLowerCase().includes(query) ||
        dest.country.ar.includes(query)
      );
    });
  };

  const getDestinationDates = (index: number) => {
    const start = new Date();
    start.setDate(start.getDate() + 7 + index * 3);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    
    const opt: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    
    if (lang === 'en') {
      return `${start.toLocaleDateString('en-US', opt)} - ${end.toLocaleDateString('en-US', opt)}`;
    } else {
      return `${start.toLocaleDateString('ar-EG', opt)} - ${end.toLocaleDateString('ar-EG', opt)}`;
    }
  };

  const renderDestinationCard = (
    destId: string,
    heightClass: string,
    datesIndex: number,
    isFeatured: boolean = false,
    isHalfWidth: boolean = false
  ) => {
    const dest = DESTINATIONS.find(d => d.id === destId);
    if (!dest) return null;
    const img = assets['dest_' + dest.id] || dest.image;
    const name = dest.name[lang];
    const price = dest.price;
    const dates = getDestinationDates(datesIndex);
    const isAr = lang === 'ar';

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className={`dest-card relative ${heightClass} rounded-[2rem] overflow-hidden shadow-xl group w-full`}
      >
        <SafeImage
          src={img}
          alt={name}
          className="dest-card-img absolute inset-0 w-full h-full object-cover"
          fallbackSrc={img}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent group-hover:from-black/90 group-hover:via-black/60 transition-[background] duration-300"></div>

        {isFeatured ? (
          /* Colombo/Featured style: Info and booking CTAs visible on face by default */
          <div className="absolute inset-0 z-10 flex flex-col justify-between p-8">
            <div className={`flex justify-between items-start ${isAr ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={isAr ? 'text-right' : 'text-left'}>
                <h3 className="text-3xl font-black text-white uppercase tracking-tight">{name}</h3>
                <p className="text-white/60 text-xs font-semibold mt-1">{dates}</p>
              </div>
              <div className={isAr ? 'text-left' : 'text-right'}>
                <p className="text-white/80 text-[10px] font-black uppercase tracking-widest leading-none">
                  {lang === 'en' ? 'Economy' : 'درجة سياحية'}
                </p>
                <p className="text-tarco-red text-2xl font-black mt-1 leading-none">{formatPrice(price)}</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center space-y-3 w-full max-w-[280px] mx-auto pb-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToCityId(dest.id);
                  bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="w-full bg-tarco-red text-white py-3.5 rounded-full font-black uppercase tracking-widest text-xs shadow-lg shadow-red-900/30 transition-[background-color,transform] duration-150 hover:bg-red-700 active:scale-[0.97] cursor-pointer"
              >
                {t.destinations.bookNow}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToCityId(dest.id);
                  bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="inline-block text-white text-xs font-black uppercase tracking-widest border-b-2 border-white pb-0.5 transition-[color,border-color] duration-150 hover:text-tarco-red hover:border-tarco-red cursor-pointer"
              >
                {lang === 'en' ? 'Discover' : 'اكتشف'}
              </button>
            </div>
          </div>
        ) : (
          /* Normal style: Info on face, slide-up CTAs on hover */
          <>
            {/* Standard label state (hidden on hover) */}
            <div className={`absolute bottom-6 left-8 right-8 z-10 flex justify-between items-end transition-[opacity,transform] duration-250 group-hover:opacity-0 group-hover:translate-y-4 ${isAr ? 'flex-row-reverse' : ''}`}>
              <div className={isAr ? 'text-right' : 'text-left'}>
                <h3 className={`${isHalfWidth ? 'text-xl' : 'text-2xl'} font-black text-white uppercase tracking-tight`}>{name}</h3>
                <p className="text-white/60 text-xs font-semibold mt-1">{dates}</p>
              </div>
              <div className={isAr ? 'text-left' : 'text-right'}>
                <p className="text-white/80 text-[10px] font-black uppercase tracking-widest leading-none">
                  {lang === 'en' ? 'Economy' : 'درجة سياحية'}
                </p>
                <p className="text-tarco-red text-2xl font-black mt-1 leading-none">{formatPrice(price)}</p>
              </div>
            </div>

            {/* Hover reveal overlay */}
            <div className="absolute inset-0 z-20 opacity-0 group-hover:opacity-100 translate-y-6 group-hover:translate-y-0 transition-[opacity,transform] duration-250 flex flex-col items-center justify-center p-8 text-center">
              <div className={`space-y-4 w-full ${isHalfWidth ? 'max-w-[190px]' : 'max-w-[280px]'}`}>
                <h3 className={`${isHalfWidth ? 'text-xl' : 'text-2xl'} font-black text-white uppercase tracking-tight mb-1 leading-tight`}>{name}</h3>
                <p className="text-white/60 text-xs font-semibold leading-none">{dates}</p>
                <p className="text-tarco-red text-xl font-black leading-none">{formatPrice(price)}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setToCityId(dest.id);
                    bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`w-full bg-tarco-red text-white ${isHalfWidth ? 'py-2.5 text-[9px]' : 'py-3 text-[10px]'} rounded-full font-black uppercase tracking-widest shadow-lg shadow-red-900/30 transition-[background-color,transform] duration-150 hover:bg-red-700 active:scale-[0.97] cursor-pointer`}
                >
                  {t.destinations.bookNow}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setToCityId(dest.id);
                    bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`inline-block text-white ${isHalfWidth ? 'text-[9px]' : 'text-[10px]'} font-black uppercase tracking-widest border-b border-white pb-0.5 transition-[color,border-color] duration-150 hover:text-tarco-red hover:border-tarco-red cursor-pointer`}
                >
                  {lang === 'en' ? 'Discover' : 'اكتشف'}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    );
  };

  const [isLiveSearchOpen, setIsLiveSearchOpen] = useState(false);
  const [isBookingFocused, setIsBookingFocused] = useState(false);
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [departureDate, setDepartureDate] = useState<Date | null>(new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [isFlexibleDates, setIsFlexibleDates] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [passengers, setPassengers] = useState<PassengerCount>({ adults: 1, children: 0, infants: 0 });
  const [showPaxDropdown, setShowPaxDropdown] = useState(false);
  const [selectedFare, setSelectedFare] = useState<Fare | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // --- Passenger Details States ---
  const [passengerDetails, setPassengerDetails] = useState<PassengerInfo[]>([]);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [passengerErrors, setPassengerErrors] = useState<Record<string, string>>({});
  const [selectedSuccessPaxIdx, setSelectedSuccessPaxIdx] = useState(0);
  const [selectedSuccessDirection, setSelectedSuccessDirection] = useState<'outbound' | 'return'>('outbound');

  // ── Validation errors state ──────────────────────────────────────────────
  const [searchErrors, setSearchErrors] = useState<{
    from?: string;
    to?: string;
    dates?: string;
    same?: string;
  }>({});
  const [isSearchSubmitting, setIsSearchSubmitting] = useState(false);

  // Flexible Date Pricing Matrix State Variables
  const [selectedClass, setSelectedClass] = useState<'economy' | 'business'>('economy');
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'SAR' | 'QAR'>('USD');
  const [departureOffset, setDepartureOffset] = useState<number>(0);
  const [returnOffset, setReturnOffset] = useState<number>(0);
  const [gridBaseDeparture, setGridBaseDeparture] = useState<Date | null>(null);
  const [gridBaseReturn, setGridBaseReturn] = useState<Date | null>(null);

  // Sync grid base dates on entering results step
  useEffect(() => {
    if (step === 'results') {
      setGridBaseDeparture(departureDate || new Date());
      setGridBaseReturn(returnDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      setDepartureOffset(0);
      setReturnOffset(0);
    }
  }, [step]);

  // Sync/Resize passenger details list based on selected passenger counts
  useEffect(() => {
    const totalPaxCount = passengers.adults + passengers.children + passengers.infants;
    if (passengerDetails.length !== totalPaxCount) {
      const details: PassengerInfo[] = [];
      for (let i = 0; i < passengers.adults; i++) {
        details.push({
          title: 'Mr',
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          nationality: 'Sudanese',
          passportNumber: '',
          passportExpiry: '',
          gender: 'Male',
          type: 'adult'
        });
      }
      for (let i = 0; i < passengers.children; i++) {
        details.push({
          title: 'Mstr',
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          nationality: 'Sudanese',
          passportNumber: '',
          passportExpiry: '',
          gender: 'Male',
          type: 'child'
        });
      }
      for (let i = 0; i < passengers.infants; i++) {
        details.push({
          title: 'Mstr',
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          nationality: 'Sudanese',
          passportNumber: '',
          passportExpiry: '',
          gender: 'Male',
          type: 'infant'
        });
      }
      setPassengerDetails(details);
    }
  }, [passengers, passengerDetails.length]);

  // Exchange rate functions & helpers
  const convertUsd = (usd: number) => {
    switch (selectedCurrency) {
      case 'SAR':
        return Math.round(usd * 3.75);
      case 'QAR':
        return Math.round(usd * 3.64);
      default:
        return usd;
    }
  };

  const formatPriceVal = (convertedPrice: number) => {
    const isAr = lang === 'ar';
    switch (selectedCurrency) {
      case 'SAR':
        return isAr ? `${convertedPrice} ر.س` : `${convertedPrice} SAR`;
      case 'QAR':
        return isAr ? `${convertedPrice} ر.ق` : `${convertedPrice} QAR`;
      default:
        return isAr ? `${convertedPrice} دولار` : `$${convertedPrice}`;
    }
  };

  const formatPrice = (usd: number) => {
    return formatPriceVal(convertUsd(usd));
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const getCellPrice = (dep: Date, ret: Date | null, cabin: 'economy' | 'business') => {
    if (isPastDate(dep)) return null;
    if (ret && isPastDate(ret)) return null;

    const dest = DESTINATIONS.find(d => d.id === toCityId) || DESTINATIONS[2];
    let base = dest.price;

    if (!ret) {
      // One-way pricing
      base = Math.round(base * 0.6);
      const depDay = dep.getDay();
      if (depDay === 0 || depDay === 5 || depDay === 6) {
        base += 45;
      }
      base += (dep.getDate() * 7) % 35;
    } else {
      // Round-trip pricing
      const timeDiff = ret.getTime() - dep.getTime();
      if (timeDiff < 0) return null; // Not available
      const dayDiff = Math.ceil(timeDiff / (24 * 60 * 60 * 1000));
      if (dayDiff < 1) return null; // Too short

      const depDay = dep.getDay();
      const retDay = ret.getDay();
      if (depDay === 0 || depDay === 5 || depDay === 6) base += 35;
      if (retDay === 0 || retDay === 5 || retDay === 6) base += 35;

      if (dayDiff < 3) base += 25;
      if (dayDiff > 10) base += 15;

      base += (dep.getDate() * 7 + ret.getDate() * 13) % 45;
    }

    if (cabin === 'business') {
      base = base * 3;
    }

    return base;
  };

  const getGridDepartureDates = () => {
    const base = gridBaseDeparture || departureDate || new Date();
    const dates: Date[] = [];
    for (let i = 0; i < 8; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - 2 + departureOffset + i);
      dates.push(d);
    }
    return dates;
  };

  const getGridReturnDates = () => {
    const base = gridBaseReturn || returnDate || new Date();
    const dates: Date[] = [];
    for (let j = 0; j < 7; j++) {
      const d = new Date(base);
      d.setDate(base.getDate() - 3 + returnOffset + j);
      dates.push(d);
    }
    return dates;
  };

  const getFarePrice = (fareId: string, cellPrice: number) => {
    if (selectedClass === 'economy') {
      if (fareId === 'lite') return cellPrice;
      if (fareId === 'semi') return Math.round(cellPrice * 1.3);
      return Math.round(cellPrice * 2.5);
    } else {
      if (fareId === 'lite') return Math.round(cellPrice * 0.4);
      if (fareId === 'semi') return Math.round(cellPrice * 0.5);
      return cellPrice;
    }
  };

  const getCheapestCell = (depDates: Date[], retDates: Date[]) => {
    let minPrice = Infinity;
    let cheapestDep: Date | null = null;
    let cheapestRet: Date | null = null;

    depDates.forEach(dep => {
      retDates.forEach(ret => {
        const price = getCellPrice(dep, ret, selectedClass);
        if (price !== null && price < minPrice) {
          minPrice = price;
          cheapestDep = dep;
          cheapestRet = ret;
        }
      });
    });

    return { minPrice, cheapestDep, cheapestRet };
  };

  const getCheapestCellOneWay = (depDates: Date[]) => {
    let minPrice = Infinity;
    let cheapestDep: Date | null = null;

    depDates.forEach(dep => {
      const price = getCellPrice(dep, null, selectedClass);
      if (price !== null && price < minPrice) {
        minPrice = price;
        cheapestDep = dep;
      }
    });

    return { minPrice, cheapestDep };
  };

  const handleCellClick = (dep: Date, ret: Date | null) => {
    setDepartureDate(dep);
    if (ret) {
      setReturnDate(ret);
    }
  };

  // Sync selected fare's price when date/class/currency changes
  useEffect(() => {
    if (selectedFare && departureDate) {
      const cellPrice = getCellPrice(departureDate, isRoundTrip ? returnDate : null, selectedClass);
      if (cellPrice !== null) {
        const newPrice = getFarePrice(selectedFare.id, cellPrice);
        if (selectedFare.price !== newPrice) {
          setSelectedFare(prev => prev ? { ...prev, price: newPrice } : null);
        }
      }
    }
  }, [departureDate, returnDate, selectedClass, selectedCurrency, isRoundTrip]);

  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Test Connection & Auth Readiness
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        console.error("Please check your Firebase configuration.");
      }
    }
    testConnection();

    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Assets from Firestore
  useEffect(() => {
    const path = 'assets';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const assetMap: Record<string, string> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.name && data.url) {
          assetMap[data.name] = data.url;
        }
      });
      setAssets(assetMap);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, []);

  // Auto-scroll to the calendar when it opens
  useEffect(() => {
    if (showCalendar && bookingRef.current) {
      setTimeout(() => {
        bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [showCalendar]);

  // Auto-scroll to top when moving to the next checkout steps
  useEffect(() => {
    if (step !== 'search') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  const handleSwap = () => {
    const temp = fromCityId;
    setFromCityId(toCityId);
    setToCityId(temp);
  };

  const validateSearch = (): boolean => {
    const errors: typeof searchErrors = {};
    const isAr = lang === 'ar';

    if (!fromCityId) {
      errors.from = isAr ? 'يرجى اختيار مدينة المغادرة' : 'Please select a departure city';
    }
    if (!toCityId) {
      errors.to = isAr ? 'يرجى اختيار وجهتك' : 'Please select a destination';
    }
    if (fromCityId && toCityId && fromCityId === toCityId) {
      errors.same = isAr ? 'يجب أن تختلف مدينة المغادرة عن الوجهة' : 'Departure and destination must be different';
    }
    if (!departureDate) {
      errors.dates = isAr ? 'يرجى اختيار تاريخ المغادرة' : 'Please select a departure date';
    }
    if (isRoundTrip && departureDate && returnDate) {
      if (returnDate <= departureDate) {
        errors.dates = isAr
          ? 'يجب أن يكون تاريخ العودة بعد تاريخ المغادرة'
          : 'Return date must be after the departure date';
      }
    }

    setSearchErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassengers = () => {
    const errors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!contactEmail) {
      errors['contact_email'] = lang === 'en' ? 'Email is required' : 'البريد الإلكتروني مطلوب';
    } else if (!emailRegex.test(contactEmail)) {
      errors['contact_email'] = lang === 'en' ? 'Invalid email format' : 'صيغة البريد الإلكتروني غير صحيحة';
    }
    
    if (!contactPhone) {
      errors['contact_phone'] = lang === 'en' ? 'Phone is required' : 'رقم الهاتف مطلوب';
    } else if (contactPhone.replace(/\D/g, '').length < 7) {
      errors['contact_phone'] = lang === 'en' ? 'Invalid phone format' : 'رقم الهاتف غير صحيح';
    }

    passengerDetails.forEach((pax, idx) => {
      if (!pax.firstName.trim()) {
        errors[`pax_${idx}_firstName`] = lang === 'en' ? 'First name is required' : 'الاسم الأول مطلوب';
      }
      if (!pax.lastName.trim()) {
        errors[`pax_${idx}_lastName`] = lang === 'en' ? 'Last name is required' : 'الاسم الأخير مطلوب';
      }
      if (!pax.dateOfBirth) {
        errors[`pax_${idx}_dateOfBirth`] = lang === 'en' ? 'Date of birth is required' : 'تاريخ الميلاد مطلوب';
      }
      if (!pax.passportNumber.trim()) {
        errors[`pax_${idx}_passportNumber`] = lang === 'en' ? 'Passport number is required' : 'رقم جواز السفر مطلوب';
      }
      if (!pax.passportExpiry) {
        errors[`pax_${idx}_passportExpiry`] = lang === 'en' ? 'Expiry date is required' : 'تاريخ الانتهاء مطلوب';
      }
    });

    setPassengerErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      const firstErrorKey = Object.keys(errors)[0];
      const errorEl = document.getElementById(firstErrorKey);
      if (errorEl) {
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    return true;
  };

  const nextStep = () => {
    // Validate search form before proceeding
    if (step === 'search') {
      if (!validateSearch()) return;
      if (isSearchSubmitting) return; // prevent double-submit
      setIsSearchSubmitting(true);
    }

    let nextS: Step = 'results';
    if (step === 'search') nextS = 'results';
    else if (step === 'results') nextS = 'passengers';
    else if (step === 'passengers') {
      if (!validatePassengers()) return;
      nextS = 'services';
    }
    else if (step === 'services') nextS = 'seats';
    else if (step === 'seats') {
      nextS = 'success';
    }

    setNextStepId(nextS);
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      setStep(nextS);
      setNextStepId(null);
      setIsSearchSubmitting(false);
    }, 1500);
  };

  const toggleService = (id: string) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const updatePax = (type: keyof PassengerCount, delta: number) => {
    setPassengers(prev => ({
      ...prev,
      [type]: Math.max(type === 'adults' ? 1 : 0, prev[type] + delta)
    }));
  };

  const getBookingTotal = () => {
    const totalPax = passengers.adults + passengers.children + passengers.infants;
    const baseFare = (selectedFare?.price || 0) * totalPax;
    const servicesTotal = selectedServices.reduce((acc, id) => acc + (EXTRA_SERVICES.find(s => s.id === id)?.price || 0), 0);
    const seatTotal = selectedSeat ? selectedSeat.price : 0;
    return baseFare + servicesTotal + seatTotal;
  };

  const getPaxSeatLabel = (paxIdx: number) => {
    if (!selectedSeat) return '-';
    const match = selectedSeat.label.match(/^(\d+)([A-F])$/);
    if (!match) return selectedSeat.label;
    const row = parseInt(match[1], 10);
    const colLetter = match[2];
    const colLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const startColIdx = colLetters.indexOf(colLetter);
    const newColIdx = (startColIdx + paxIdx) % 6;
    const rowOffset = Math.floor((startColIdx + paxIdx) / 6);
    const newRow = row + rowOffset;
    const newColLetter = colLetters[newColIdx];
    return `${newRow}${newColLetter}`;
  };

  const steps = [
    { id: 'search', label: t.steps.search, icon: Search },
    { id: 'results', label: t.steps.results, icon: Ticket },
    { id: 'passengers', label: t.steps.passengers, icon: Users },
    { id: 'services', label: t.steps.services, icon: Briefcase },
    { id: 'seats', label: t.steps.seats, icon: Armchair },
    { id: 'success', label: t.steps.success, icon: ShieldCheck },
  ];

  const scrollToBooking = useCallback(() => {
    bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const renderBookingHeader = () => {
    const totalPax = passengers.adults + passengers.children + passengers.infants;
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md flex flex-col md:flex-row justify-between items-center gap-6 stagger-item">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-black text-tarco-navy">{fromCity.code}</span>
            <ArrowRightLeft size={18} className="text-tarco-red animate-pulse" />
            <span className="text-2xl font-black text-tarco-navy">{toCity.code}</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">
              {isRoundTrip ? t.booking.roundTrip : t.booking.oneWay}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            {departureDate?.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })}
            {isRoundTrip && ` - ${returnDate?.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })}`}
            {` • ${totalPax} ${lang === 'en' ? 'Passenger(s)' : 'مسافر(ين)'}`}
          </p>
        </div>
        <button
          onClick={() => setStep('search')}
          className="w-full md:w-auto px-6 py-3 border-2 border-slate-200 hover:border-tarco-red hover:text-tarco-red text-slate-500 rounded-2xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
        >
          {lang === 'en' ? 'Modify search' : 'تعديل البحث'}
        </button>
      </div>
    );
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {!isAppLoaded ? (
          <StartupLoader key="startup" onComplete={() => setIsAppLoaded(true)} />
        ) : (
          <motion.div
            key="main-app"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            dir={t.dir}
            className={`min-h-screen bg-slate-50 ${t.font} text-slate-900 selection:bg-tarco-red/10 selection:text-tarco-red`}
          >
            {/* Step Transition Overlay */}
            <AnimatePresence>
              {isLoading && nextStepId && (
                <StepTransition nextStep={nextStepId} lang={lang} />
              )}
            </AnimatePresence>

            {/* Search Overlay */}
            <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              className="fixed inset-0 z-[200] bg-tarco-blue/90 flex flex-col items-center justify-center p-6"
            >
              <button
                onClick={() => setShowSearch(false)}
                className="absolute top-8 end-8 text-white/50 hover:text-white transition-colors"
              >
                <X size={40} strokeWidth={1} />
              </button>
              <div className="w-full max-w-4xl space-y-12">
                <div className="space-y-4 text-center">
                  <h2 className="text-4xl md:text-6xl font-extralight text-white tracking-tight">{t.search.overlayTitle}</h2>
                  <p className="text-white/40 text-lg">{t.search.overlaySubtitle}</p>
                </div>
                <div className="relative group">
                  <Search className="absolute start-6 top-1/2 -translate-y-1/2 text-tarco-red group-focus-within:scale-110 transition-transform" size={32} />
                  <input
                    autoFocus
                    type="text"
                    placeholder={t.search.placeholder}
                    className="w-full bg-white/5 border-b-2 border-white/10 py-8 ps-20 pe-8 text-3xl md:text-5xl font-light text-white outline-none focus:border-tarco-red transition-colors placeholder:text-white/20"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
                  {[
                    { key: 'destinations', label: t.search.categories.destinations },
                    { key: 'status', label: t.search.categories.status },
                    { key: 'requirements', label: t.search.categories.requirements }
                  ].map((cat) => (
                    <div key={cat.key} className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-tarco-red">{cat.label}</h3>
                      <div className="flex flex-col gap-2">
                        {[1, 2, 3].map(i => (
                          <button key={i} className="text-start text-white/60 hover:text-white transition-colors text-lg font-light flex items-center gap-2 group">
                            <ArrowRightLeft size={16} className={`opacity-0 group-hover:opacity-100 transition-all ${lang === 'ar' ? 'translate-x-2 group-hover:translate-x-0' : '-translate-x-2 group-hover:translate-x-0'}`} />
                            {cat.key === 'destinations' ? (lang === 'en' ? ['Dubai (DXB)', 'Cairo (CAI)', 'Riyadh (RUH)'][i - 1] : ['دبي (DXB)', 'القاهرة (CAI)', 'الرياض (RUH)'][i - 1]) : cat.label + ' ' + i}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Bar */}
        <motion.nav
          animate={{
            backgroundColor: navScrolled ? 'rgba(4, 20, 56, 0.98)' : 'rgba(4, 20, 56, 0.35)',
            backdropFilter: 'blur(20px)',
            paddingTop: navScrolled ? '0.75rem' : '1.25rem',
            paddingBottom: navScrolled ? '0.75rem' : '1.25rem',
            borderBottomColor: navScrolled ? 'rgba(227, 30, 36, 0.4)' : 'rgba(255, 255, 255, 0.08)',
          }}
          initial={false}
          className="fixed top-0 left-0 right-0 z-[100] px-6 lg:px-12 flex justify-between items-center transition-all duration-500 border-b border-transparent"
        >
          {/* Logo Section */}
          <div className="flex items-center gap-16">
            <a href="/" className="relative group">
              <SafeImage
                src={assets['logo_main'] || "/Images/logo_main.png"}
                alt="Tarco Aviation"
                className="h-10 w-32 md:h-12 md:w-40 transition-all duration-500 brightness-0 invert"
                fallbackSrc="/Images/logo_main.png"
              />
            </a>

            {/* Main Menu Links */}
            <div className="hidden lg:flex gap-8 items-center h-full">
              {navMenu.map((menu) => (
                <div
                  key={menu.id}
                  className="relative group h-full py-4"
                  onMouseEnter={() => setActiveMenu(menu.id)}
                  onMouseLeave={() => setActiveMenu(null)}
                >
                  <button
                    className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:text-tarco-red text-white"
                  >
                    {menu.label}
                    <ChevronDown size={14} className={`transition-transform duration-300 ${activeMenu === menu.id ? 'rotate-180 text-tarco-red' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {activeMenu === menu.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 15, x: lang === 'en' ? -10 : 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, x: lang === 'en' ? -10 : 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        style={{ originX: lang === 'en' ? 0 : 1 }}
                        className={`absolute top-full ${lang === 'en' ? 'left-0' : 'right-0'} w-[451px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden p-8 z-[60]`}
                      >
                        <div className="grid grid-cols-1 gap-6">
                          {menu.items.map((item) => (
                            <button
                              key={item.name}
                              className="flex items-start gap-5 p-4 rounded-2xl hover:bg-slate-50 transition-all group/item text-start"
                            >
                              <div className="mt-1 w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-tarco-blue group-hover/item:bg-tarco-red group-hover/item:text-white transition-colors">
                                <item.icon size={24} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-black uppercase tracking-widest text-tarco-blue group-hover/item:text-tarco-red transition-colors">{item.name}</span>
                                  {lang === 'en' ? (
                                    <ChevronRight size={16} className="text-slate-300 group-hover/item:translate-x-1 transition-transform" />
                                  ) : (
                                    <ChevronLeft size={16} className="text-slate-300 group-hover/item:-translate-x-1 transition-transform" />
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Explore {menu.label}</span>
                          <button className="flex items-center gap-2 px-6 py-2 bg-tarco-blue text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-tarco-red transition-colors">
                            {lang === 'en' ? 'View All' : 'عرض الكل'} <ExternalLink size={12} className={lang === 'ar' ? 'scale-x-[-1]' : ''} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* Action Icons & Profile */}
          <div className="flex items-center gap-6 lg:gap-8">
            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:scale-105 text-white hover:bg-white/10"
            >
              <Globe size={18} />
              <span className="text-[10px] font-black tracking-widest uppercase">
                {lang === 'en' ? 'AR' : 'EN'}
              </span>
            </button>

            {/* Search Icon */}
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-full transition-all hover:scale-110 text-white hover:bg-white/10"
            >
              <Search size={22} />
            </button>

            {/* Auth / Profile */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4 border-l pl-8 border-slate-700">
                  <div className="w-10 h-10 rounded-full bg-tarco-blue/10 flex items-center justify-center text-tarco-blue border-2 border-tarco-blue/20">
                    <User size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Logged In</span>
                    <button
                      onClick={() => logout()}
                      className="text-[10px] font-bold text-tarco-red hover:underline decoration-2 underline-offset-4 text-start"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => signIn()}
                  className="flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl bg-tarco-red text-white hover:bg-red-700 shadow-red-950/20"
                >
                  <UserRound size={16} />
                  {t.nav.login}
                </motion.button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(true)}
              className="lg:hidden p-2 rounded-xl border-2 border-white/20 text-white hover:bg-white/10"
            >
              <Menu size={24} />
            </button>
          </div>
        </motion.nav>
        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[300] bg-white flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <SafeImage
                  src={assets['logo_main'] || "/Images/logo_main.png"}
                  alt="Tarco Aviation"
                  className="h-8 w-24"
                  fallbackSrc="/Images/logo_main.png"
                />
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 bg-slate-100 rounded-full text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-8">
                <div className="px-6 space-y-10">
                  {navMenu.map((menu, idx) => (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * idx }}
                      key={menu.id}
                      className="space-y-4"
                    >
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-tarco-red">{menu.label}</h3>
                      <div className="flex flex-col gap-6">
                        {menu.items.map((item) => (
                          <button key={item.name} className="flex items-center gap-4 text-start group">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-tarco-blue group-hover:bg-tarco-red group-hover:text-white transition-colors">
                              <item.icon size={20} />
                            </div>
                            <span className="text-xl font-light text-slate-900 group-hover:text-tarco-red transition-colors">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                <button
                  onClick={() => signIn()}
                  className="w-full bg-tarco-blue text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-900/20"
                >
                  {t.nav.login}
                </button>
                <div className="flex items-center justify-between px-2">
                  <button
                    onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"
                  >
                    <Globe size={14} />
                    {lang === 'en' ? 'Arabic' : 'English'}
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.utility.currency.split(': ')[1]}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Scroll-to-Book CTA */}
        <AnimatePresence>
          {showScrollCTA && step === 'search' && (
            <motion.button
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              onClick={scrollToBooking}
              className="cta-float-btn fixed bottom-8 right-8 z-[150] bg-tarco-red text-white px-6 py-4 rounded-2xl shadow-2xl shadow-red-200 flex items-center gap-3 font-black uppercase tracking-widest text-xs"
            >
              <Zap size={16} fill="currentColor" />
              {t.hero.bookNow}
              <ChevronDown size={14} className="animate-bounce" />
            </motion.button>
          )}
        </AnimatePresence>


        <div>
          {/* Progress Tracker (only on checkout steps) */}
          {step !== 'search' && (
            <div className="max-w-7xl mx-auto px-4 pt-28">
              <div className="overflow-x-auto scrollbar-none w-full flex py-2">
                <div className="flex items-center gap-1.5 md:gap-4 bg-white px-3 py-3 md:px-8 md:py-4 rounded-2xl shadow-sm border border-slate-100 flex-nowrap flex-shrink-0 mx-auto w-max">
                  {steps.map((s, i) => {
                    const isActive = s.id === step;
                    const isPast = steps.findIndex(x => x.id === step) > i;
                    return (
                      <React.Fragment key={s.id}>
                        <div className="stagger-item flex items-center gap-1.5 md:gap-3 flex-shrink-0" style={{ animationDelay: `${i * 40}ms` }}>
                          <div
                            className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-[background-color,box-shadow,transform] duration-300 flex-shrink-0 ${
                              isActive
                                ? 'bg-tarco-red text-white shadow-lg shadow-red-200 scale-110'
                                : isPast
                                ? 'bg-tarco-blue text-white'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                            style={isActive ? { transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)' } : {}}
                          >
                            {isPast ? (
                              <Check className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                            ) : (
                              <s.icon className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                            )}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest hidden sm:inline-block transition-colors duration-200 ${isActive ? 'text-tarco-blue' : 'text-slate-400'}`}>{s.label}</span>
                        </div>
                        {i < steps.length - 1 && (
                          <div className={`w-3 md:w-8 h-[2px] rounded-full overflow-hidden bg-slate-100 relative flex-shrink-0`}>
                            <div
                              className="absolute inset-0 bg-tarco-blue origin-left"
                              style={{
                                transform: isPast ? 'scaleX(1)' : 'scaleX(0)',
                                transition: 'transform 450ms cubic-bezier(0.23,1,0.32,1)'
                              }}
                            />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                {/* Hero Section - Full Bleed */}
                <div className="relative h-[48vh] md:h-[65vh] min-h-[360px] md:min-h-[520px] w-full overflow-hidden bg-slate-950">
                  <div className="absolute inset-0 overflow-hidden">
                    {/* Fallback Background Image behind the Canvas */}
                    <div 
                      className="absolute inset-0 bg-cover bg-[position:70%_center] md:bg-center bg-no-repeat opacity-65 md:opacity-50"
                      style={{ backgroundImage: `url(${assets['hero_bg'] || '/Images/hero_bg.png'})` }}
                    />
                    <canvas 
                      ref={canvasRef} 
                      id="canvas3d" 
                      className="hidden md:block absolute inset-0 w-full h-full outline-none border-none z-10 opacity-70 pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#041438]/85 via-[#041438]/50 to-[#041438]/95 pointer-events-none z-20" />
                  </div>

                  <div className="absolute inset-0 flex flex-col justify-center pb-16 md:pb-28 px-5 md:px-12 lg:px-24 z-30 pointer-events-none">
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 1 }}
                      className="max-w-3xl space-y-4 md:space-y-6 text-start"
                    >
                      <div className="space-y-3 md:space-y-4 text-start">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white text-start">
                          {t.hero.title}<br />
                          <span className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-1">
                            {t.hero.suffix}
                            {t.hero.highlight && (
                              <span className="bg-tarco-red text-white px-3 py-0.5 md:px-4 md:py-1 inline-flex items-center justify-center shadow-xl shadow-red-950/40 rounded-lg text-lg sm:text-xl md:text-3xl font-black">
                                {t.hero.highlight}
                              </span>
                            )}
                          </span>
                        </h1>
                        <p className="text-[11px] sm:text-xs md:text-sm text-slate-200 font-normal tracking-wide max-w-lg opacity-95 leading-relaxed text-start">
                          {t.hero.subtitle}
                        </p>
                      </div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                        className="flex items-center gap-6 pointer-events-auto justify-start"
                      >
                        <button
                          onClick={scrollToBooking}
                          className="px-6 py-2.5 md:px-8 md:py-3 rounded-full border border-white/60 text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] bg-white/5 hover:bg-white hover:text-[#041438] transition-all duration-300 shadow-lg backdrop-blur-sm"
                        >
                          {t.hero.cta}
                        </button>
                      </motion.div>
                    </motion.div>
                  </div>
                </div>

                {/* Focus Mode Backdrop */}
                <AnimatePresence>
                  {isBookingFocused && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsBookingFocused(false)}
                      className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-40"
                    />
                  )}
                </AnimatePresence>

                {/* Sticky Booking Card */}
                <div 
                  ref={bookingRef} 
                  className={`relative z-50 -mt-16 sm:-mt-24 md:-mt-32 max-w-7xl mx-auto px-4 transition-all duration-500 ${isBookingFocused ? 'scale-[1.02]' : ''}`}
                >
                  <div 
                    className={`bg-white rounded-2xl border border-slate-100 overflow-visible transition-shadow duration-500 ${
                      isBookingFocused ? 'shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)]' : 'shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)]'
                    }`}
                    onClick={() => setIsBookingFocused(true)}
                  >

                    {/* Main Tabs - styled like Qatar Airways / Modern Tabs */}
                    <div className="flex bg-slate-100 relative rounded-t-2xl overflow-hidden">
                      {[{ id: 'booking', icon: Plane, label: t.nav.book }, { id: 'manage', icon: ShieldCheck, label: t.booking.manage }, { id: 'checkin', icon: Check, label: t.booking.checkin }].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex-1 py-5 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id
                              ? 'bg-white text-tarco-red'
                              : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                            }`}
                        >
                          <tab.icon size={16} strokeWidth={1.5} className={activeTab === tab.id ? 'text-tarco-red' : 'text-slate-400'} />
                          {tab.label}
                          {activeTab === tab.id && <div className="absolute top-0 left-0 right-0 h-1 bg-tarco-red" />}
                        </button>
                      ))}
                    </div>

                    <div className="p-6 md:p-8">
                      {activeTab === 'booking' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                          {/* —— Row 1: Trip-type radios —— */}
                          <div className="flex items-center gap-5 mb-5">
                            {[
                              { label: t.booking.roundTrip, value: 'round' },
                              { label: t.booking.oneWay, value: 'one' },
                              { label: t.booking.multiCity, value: 'multi' },
                            ].map(({ label, value }) => (
                              <label key={label} className="flex items-center gap-2 cursor-pointer group">
                                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${isRoundTrip === (value === 'round') ? 'border-tarco-red' : 'border-slate-300 group-hover:border-slate-400'}`}>
                                  {isRoundTrip === (value === 'round') && <span className="w-2 h-2 rounded-full bg-tarco-red block" />}
                                </span>
                                <button
                                  onClick={() => setIsRoundTrip(value === 'round')}
                                  className={`text-sm font-semibold transition-colors ${isRoundTrip === (value === 'round') ? 'text-tarco-blue' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                  {label}
                                </button>
                              </label>
                            ))}
                          </div>

                          <div className="flex flex-col md:flex-row items-stretch rounded-[24px] border border-slate-200 bg-white overflow-visible mb-6 shadow-sm divide-y md:divide-y-0 ltr:md:divide-x rtl:md:divide-x-reverse divide-slate-200/60">

                            {/* From */}
                            <div className={`flex-1 relative group ${activeDropdown === 'from' ? 'z-50' : ''}`}>
                              <div 
                                onClick={() => fromInputRef.current?.focus()}
                                className={`flex items-center gap-3 px-4 py-4 h-full relative cursor-text ${activeDropdown === 'from' ? 'z-40' : ''}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <MapPin size={16} strokeWidth={1.5} className="text-slate-400" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.booking.from}</span>
                                  </div>
                                  <input
                                     ref={fromInputRef}
                                     value={activeDropdown === 'from' ? fromSearch : from}
                                     onFocus={() => {
                                       setActiveDropdown('from');
                                       setFromSearch('');
                                     }}
                                     onChange={(e) => setFromSearch(e.target.value)}
                                     placeholder={from}
                                     className="bg-transparent font-semibold text-sm text-slate-800 w-full outline-none placeholder:text-slate-400 leading-tight text-start animate-none"
                                   />
                                </div>
                              </div>

                              {/* Swap button sits between From and To */}
                               <motion.button
                                 whileHover={{ rotate: 180, scale: 1.1 }}
                                 whileTap={{ scale: 0.9 }}
                                 transition={{ type: 'spring', stiffness: 300 }}
                                 onClick={handleSwap}
                                 className={`absolute ${lang === 'ar' ? 'left-[-16px]' : 'right-[-16px]'} top-1/2 -translate-y-1/2 z-20 bg-white border border-slate-200 shadow-md p-1.5 rounded-full text-tarco-blue hidden md:flex items-center justify-center hover:bg-tarco-blue hover:text-white transition-colors`}
                               >
                                 <ArrowRightLeft size={14} strokeWidth={1.5} />
                               </motion.button>

                              {/* Mobile swap button */}
                              <button
                                onClick={handleSwap}
                                className="md:hidden w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-tarco-blue bg-slate-50 border-t border-b border-slate-100"
                              >
                                <ArrowRightLeft size={14} /> {lang === 'en' ? 'Swap' : 'تبديل'}
                              </button>

                              <AnimatePresence>
                                {activeDropdown === 'from' && (
                                  <>
                                    <div className="fixed inset-0 z-30" onClick={() => {
                                      setActiveDropdown(null);
                                      setFromSearch('');
                                    }} />
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 10 }}
                                      className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 p-2 z-40 max-h-64 overflow-y-auto"
                                    >
                                      {getFilteredDestinations(fromSearch, toCityId).length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-slate-400 italic text-center">
                                          {lang === 'en' ? 'No destinations found' : 'لم يتم العثور على وجهات'}
                                        </div>
                                      ) : (
                                        getFilteredDestinations(fromSearch, toCityId).map((dest) => (
                                          <button
                                            key={dest.id}
                                            onClick={() => {
                                              setFromCityId(dest.id);
                                              setActiveDropdown(null);
                                              setFromSearch('');
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-start"
                                          >
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                                              <MapPin size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-sm text-slate-800 truncate">
                                                  {dest.name[lang]}
                                                </span>
                                                <span className="text-xs font-black text-tarco-blue bg-blue-50 px-2 py-0.5 rounded-md flex-shrink-0">
                                                  {dest.code}
                                                </span>
                                              </div>
                                              <span className="text-[10px] text-slate-400 block truncate text-start">
                                                {dest.country[lang]}
                                              </span>
                                            </div>
                                          </button>
                                        ))
                                      )}
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* To */}
                            <div className={`flex-1 relative group ${activeDropdown === 'to' ? 'z-50' : ''}`}>
                              <div 
                                onClick={() => toInputRef.current?.focus()}
                                className={`flex items-center gap-3 px-4 py-4 h-full relative cursor-text ${activeDropdown === 'to' ? 'z-40' : ''}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <MapPin size={16} strokeWidth={1.5} className="text-tarco-red" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.booking.to}</span>
                                  </div>
                                  <input
                                     ref={toInputRef}
                                     value={activeDropdown === 'to' ? toSearch : to}
                                     onFocus={() => {
                                       setActiveDropdown('to');
                                       setToSearch('');
                                     }}
                                     onChange={(e) => setToSearch(e.target.value)}
                                     placeholder={to}
                                     className="bg-transparent font-semibold text-sm text-slate-800 w-full outline-none placeholder:text-slate-400 leading-tight text-start animate-none"
                                   />
                                </div>
                              </div>

                              <AnimatePresence>
                                {activeDropdown === 'to' && (
                                  <>
                                    <div className="fixed inset-0 z-30" onClick={() => {
                                      setActiveDropdown(null);
                                      setToSearch('');
                                    }} />
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 10 }}
                                      className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 p-2 z-40 max-h-64 overflow-y-auto"
                                    >
                                      {getFilteredDestinations(toSearch, fromCityId).length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-slate-400 italic text-center">
                                          {lang === 'en' ? 'No destinations found' : 'لم يتم العثور على وجهات'}
                                        </div>
                                      ) : (
                                        getFilteredDestinations(toSearch, fromCityId).map((dest) => (
                                          <button
                                            key={dest.id}
                                            onClick={() => {
                                              setToCityId(dest.id);
                                              setActiveDropdown(null);
                                              setToSearch('');
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-start"
                                          >
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                                              <MapPin size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-sm text-slate-800 truncate">
                                                  {dest.name[lang]}
                                                </span>
                                                <span className="text-xs font-black text-tarco-blue bg-blue-50 px-2 py-0.5 rounded-md flex-shrink-0">
                                                  {dest.code}
                                                </span>
                                              </div>
                                              <span className="text-[10px] text-slate-400 block truncate text-start">
                                                {dest.country[lang]}
                                              </span>
                                            </div>
                                          </button>
                                        ))
                                      )}
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Date Picker trigger (seamless) */}
                            <div className={`flex-[1.3] relative group ${showCalendar ? 'bg-[#041438]/5' : ''}`}>
                              <HeroDatePicker
                                departureDate={departureDate}
                                returnDate={returnDate}
                                isRoundTrip={isRoundTrip}
                                isOpen={showCalendar}
                                seamless={true}
                                onToggle={() => setShowCalendar(!showCalendar)}
                                t={t}
                              />
                            </div>

                            {/* Passengers */}
                            <div className="relative flex-1">
                              <div
                                onClick={() => setShowPaxDropdown(!showPaxDropdown)}
                                className="flex items-center gap-3 px-4 py-3 h-full cursor-pointer"
                              >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Users size={16} strokeWidth={1.5} className="text-slate-400" />
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{lang === 'en' ? 'Passengers / Class' : 'المسافرون / الدرجة'}</span>
                                    </div>
                                    <span className="font-semibold text-sm text-slate-800 whitespace-nowrap block leading-tight">
                                      {passengers.adults + passengers.children + passengers.infants}{' '}
                                      {lang === 'en' ? (passengers.adults + passengers.children + passengers.infants !== 1 ? 'Passengers' : 'Passenger') : 'مسافر'} | {lang === 'en' ? 'Economy' : 'السياحية'}
                                    </span>
                                  </div>
                                  <ChevronDown size={14} strokeWidth={1.5} className="text-slate-400 ml-auto" />
                              </div>

                              <AnimatePresence>
                                {showPaxDropdown && (
                                  <>
                                    <div className="fixed inset-0 z-30" onClick={() => setShowPaxDropdown(false)} />
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 10 }}
                                      className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 z-40 space-y-6"
                                    >
                                      {[
                                        { id: 'adults', label: t.booking.adults, sub: '12+ years', icon: User },
                                        { id: 'children', label: t.booking.children, sub: '2-11 years', icon: UserRound },
                                        { id: 'infants', label: t.booking.infants, sub: 'Under 2 years', icon: Baby },
                                      ].map((p) => (
                                        <div key={p.id} className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-tarco-blue">
                                              <p.icon size={16} strokeWidth={1.5} />
                                            </div>
                                            <div>
                                              <p className="text-xs font-bold text-tarco-blue">{p.label}</p>
                                              <p className="text-[10px] text-slate-400">{lang === 'en' ? p.sub : (p.id === 'adults' ? '12+ سنة' : p.id === 'children' ? '2-11 سنة' : 'تحت سنتين')}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <button
                                              onClick={() => updatePax(p.id as keyof PassengerCount, -1)}
                                              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-tarco-red hover:border-tarco-red transition-all"
                                            >
                                              <Minus size={14} strokeWidth={2} />
                                            </button>
                                            <span className="text-sm font-bold w-4 text-center">{passengers[p.id as keyof PassengerCount]}</span>
                                            <button
                                              onClick={() => updatePax(p.id as keyof PassengerCount, 1)}
                                              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-tarco-blue hover:border-tarco-blue transition-all"
                                            >
                                              <Plus size={14} strokeWidth={2} />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                      <button
                                        onClick={() => setShowPaxDropdown(false)}
                                        className="w-full bg-tarco-blue text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-tarco-navy transition-colors"
                                      >{t.success.confirm || 'Done'}</button>
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          {/* —— Inline Calendar (expands booking card) —— */}
                          {showCalendar && (
                             <InlineCalendar
                               departureDate={departureDate}
                               returnDate={returnDate}
                               isRoundTrip={isRoundTrip}
                               isFlexible={isFlexibleDates}
                               onDepartureChange={setDepartureDate}
                               onReturnChange={setReturnDate}
                               onFlexibleChange={setIsFlexibleDates}
                               onClose={() => setShowCalendar(false)}
                               t={t}
                               lang={lang}
                             />
                          )}

                          {/* â”€â”€ Row 3: Bottom bar â€“ Promo + Search â”€â”€ */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* Promo code â€“ subtle text link style */}
                            <div className="flex items-center gap-2 group">
                              <Star size={15} className="text-tarco-red" />
                              <input
                                placeholder={`+ ${t.booking.promo || 'Add promo code'}`}
                                className="bg-transparent text-sm font-semibold text-tarco-blue placeholder:text-slate-400 outline-none w-44 border-b border-dashed border-slate-300 focus:border-tarco-blue pb-0.5 transition-colors"
                              />
                            </div>

                            {/* Search flights button */}
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => {
                                setIsBookingFocused(false);
                                nextStep();
                              }}
                              className="bg-tarco-red hover:bg-red-700 text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl shadow-red-900/10 transition-all flex items-center justify-center gap-3 w-full sm:w-auto"
                            >
                              <Search size={18} strokeWidth={1.5} />
                              {t.booking.search}
                            </motion.button>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'manage' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400">{t.booking.pnr}</label>
                            <input className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-tarco-blue transition-all" placeholder="e.g. AB1234" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400">{t.booking.lastName}</label>
                            <input className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-tarco-blue transition-all" placeholder="e.g. Seddig" />
                          </div>
                          <div className="md:col-span-2">
                            <button className="w-full bg-tarco-blue text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-tarco-navy transition-all">{t.booking.retrieve}</button>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'checkin' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400">{t.booking.ticket}</label>
                            <input className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-tarco-blue transition-all" placeholder="e.g. 123-4567890" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400">{t.booking.lastName}</label>
                            <input className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-tarco-blue transition-all" placeholder="e.g. Seddig" />
                          </div>
                          <div className="md:col-span-2">
                            <button className="w-full bg-tarco-red text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all">{t.booking.online}</button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
                {/* End of sticky booking card */}


                {/* Sections below the booking card */}
                <div className="max-w-7xl mx-auto px-4 space-y-24 pb-24">
                  {/* Complete Journey Section */}
                  <div className="py-24 space-y-12">
                    <div className="text-center space-y-4">
                      <h2 className="text-4xl font-black text-tarco-blue uppercase tracking-tight">{t.journey.title}</h2>
                      <div className="w-24 h-1 bg-tarco-red mx-auto"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                      {[
                        { icon: Armchair, title: t.journey.seats.title, desc: t.journey.seats.desc, num: '01' },
                        { icon: Download, title: t.journey.weight.title, desc: t.journey.weight.desc, num: '02' },
                        { icon: ShieldCheck, title: t.journey.guidance.title, desc: t.journey.guidance.desc, num: '03' },
                        { icon: Star, title: t.journey.manage.title, desc: t.journey.manage.desc, num: '04' }
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          whileHover={{ y: -12, boxShadow: '0 30px 60px -12px rgba(0,0,0,0.15)' }}
                          className="bg-white p-8 rounded-3xl shadow-xl border border-slate-50 text-center space-y-4 group cursor-pointer relative overflow-hidden"
                        >
                          <span className="absolute top-4 right-6 text-[3.5rem] font-black text-slate-50 group-hover:text-red-50 transition-colors select-none leading-none">{item.num}</span>
                          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-tarco-red group-hover:text-white transition-all duration-300 relative z-10">
                            <item.icon size={32} />
                          </div>
                          <h3 className="font-bold text-tarco-blue relative z-10">{item.title}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed relative z-10">{item.desc}</p>
                          <div className="pt-2 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-tarco-red opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 relative z-10">
                            {t.journey.learn} <ChevronRight size={12} className={lang === 'ar' ? 'rotate-180' : ''} />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>



                  {/* Premium Featured Destinations Grid */}
                  <div className="py-24 space-y-12">
                    <div className="text-center space-y-4">
                      <h2 className="text-4xl font-black text-tarco-blue uppercase tracking-tight">{t.destinations.title}</h2>
                      <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
                        {lang === 'en' 
                          ? 'Discover our most popular destinations and find the best deals for your next adventure.' 
                          : 'استكشف وجهاتنا الأكثر شعبية واعثر على أفضل العروض لمغامرتك القادمة.'}
                      </p>
                      <div className="w-24 h-1 bg-tarco-red mx-auto"></div>
                    </div>

                    {/* Mobile layout (standard vertical cards list) */}
                    <div className="grid grid-cols-1 gap-6 md:hidden px-4">
                      {['dubai', 'sharjah', 'jeddah', 'riyadh', 'portsudan', 'cairo', 'doha', 'addis'].map((destId, idx) => (
                        <React.Fragment key={destId}>
                          {renderDestinationCard(destId, 'h-[280px]', idx, false, false)}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Desktop layout (asymmetrical masonry grid) */}
                    <div className={`hidden md:flex gap-6 ${lang === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Left Column */}
                      <div className="flex flex-col gap-6 w-1/2">
                        {renderDestinationCard('dubai', 'h-[300px]', 0, true, false)}
                        {renderDestinationCard('riyadh', 'h-[400px]', 1, false, false)}
                        <div className="grid grid-cols-2 gap-6">
                          {renderDestinationCard('cairo', 'h-[400px]', 2, false, true)}
                          {renderDestinationCard('doha', 'h-[400px]', 3, false, true)}
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="flex flex-col gap-6 w-1/2">
                        <div className="grid grid-cols-2 gap-6">
                          {renderDestinationCard('sharjah', 'h-[400px]', 4, false, true)}
                          {renderDestinationCard('jeddah', 'h-[400px]', 5, false, true)}
                        </div>
                        {renderDestinationCard('portsudan', 'h-[400px]', 6, false, false)}
                        {renderDestinationCard('addis', 'h-[300px]', 7, false, false)}
                      </div>
                    </div>
                  </div>

                  {/* Live Statistics Ticker */}
                  <div className="py-16 bg-tarco-blue rounded-[40px] shadow-2xl overflow-hidden relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
                    <div className="relative z-10 max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
                      {liveStats.map((stat, i) => (
                        <StatCard key={i} stat={stat} lang={lang} />
                      ))}
                    </div>
                  </div>




                </div>
              </motion.div>
            )}

            {step !== 'search' && (
              <motion.div
                key="checkout"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-7xl mx-auto px-4 py-12 pb-32 lg:pb-12"
              >
                {step === 'results' && (() => {
                  const localT = {
                    en: {
                      modifySearch: 'Modify search',
                      economy: 'Economy Class',
                      business: 'Business / First Class',
                      currency: 'Currency',
                      travelClass: 'Travel Class',
                      notAvailable: 'Not available',
                      cheapest: 'Cheapest',
                      depReturn: 'Return \\ Departure',
                      departure: 'Departure',
                      return: 'Return',
                      oneWayTitle: 'Departure Dates (Flexible)',
                      roundTripTitle: 'Flexible Date Pricing Matrix',
                      selectMessage: 'Select a date combination to see fare options below'
                    },
                    ar: {
                      modifySearch: 'تعديل البحث',
                      economy: 'درجة الضيافة',
                      business: 'درجة رجال الأعمال / الأولى',
                      currency: 'العملة',
                      travelClass: 'درجة السفر',
                      notAvailable: 'غير متوفر',
                      cheapest: 'الأرخص',
                      depReturn: 'العودة \\ الذهاب',
                      departure: 'الذهاب',
                      return: 'العودة',
                      oneWayTitle: 'تواريخ المغادرة (مرنة)',
                      roundTripTitle: 'مصفوفة أسعار التواريخ المرنة',
                      selectMessage: 'اختر تاريخ الذهاب والعودة لعرض تفاصيل الأسعار أدناه'
                    }
                  }[lang as 'en' | 'ar'] || {
                    modifySearch: 'Modify search',
                    economy: 'Economy Class',
                    business: 'Business / First Class',
                    currency: 'Currency',
                    travelClass: 'Travel Class',
                    notAvailable: 'Not available',
                    cheapest: 'Cheapest',
                    depReturn: 'Return \\ Departure',
                    departure: 'Departure',
                    return: 'Return',
                    oneWayTitle: 'Departure Dates (Flexible)',
                    roundTripTitle: 'Flexible Date Pricing Matrix',
                    selectMessage: 'Select a date combination to see fare options below'
                  };

                  const depDates = getGridDepartureDates();
                  const retDates = getGridReturnDates();
                  
                  // Compute cheapest cells
                  const cheapest2D = getCheapestCell(depDates, retDates);
                  const cheapest1D = getCheapestCellOneWay(depDates);

                  // Current selected base price
                  const selectedCellPrice = getCellPrice(
                    departureDate || new Date(),
                    isRoundTrip ? returnDate : null,
                    selectedClass
                  ) || 189;

                  const totalPax = passengers.adults + passengers.children + passengers.infants;

                  return (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      {renderBookingHeader()}

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Sidebar: Fare Cards only (Desktop) */}
                        <div className="lg:col-span-3 space-y-6">
                          {/* Desktop only: Vertical fare cards stacked in sidebar */}
                          <div className="hidden lg:flex lg:flex-col lg:gap-6">
                            {FARES.map((fare, idx) => {
                              const dynamicPrice = getFarePrice(fare.id, selectedCellPrice);
                              const isSelected = selectedFare?.id === fare.id;
                              return (
                                <FareCard
                                  key={fare.id}
                                  fare={fare}
                                  dynamicPrice={dynamicPrice}
                                  isSelected={isSelected}
                                  lang={lang}
                                  onClick={() => {
                                    const targetClass = fare.id === 'business' ? 'business' : 'economy';
                                    setSelectedClass(targetClass);
                                    setSelectedFare({ ...fare, price: dynamicPrice });
                                  }}
                                  t={t}
                                  formatPrice={formatPrice}
                                  delayIndex={idx}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Main Grid Area */}
                        <div className="lg:col-span-9 space-y-8 min-w-0">
                          {/* Matrix / Calendar Strip */}
                          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl space-y-4">
                            <div className="space-y-1">
                              <h3 className="text-lg font-bold text-tarco-navy">
                                {isRoundTrip ? localT.roundTripTitle : localT.oneWayTitle}
                              </h3>
                              <p className="text-xs text-slate-400">{localT.selectMessage}</p>
                            </div>

                            {isRoundTrip ? (
                              /* 2D 8x7 Pricing Matrix */
                              <div className="w-full overflow-x-auto thin-scrollbar rounded-2xl border border-slate-100">
                                <table className="w-full border-collapse text-start min-w-[800px]">
                                  <thead>
                                    <tr>
                                      {/* Top-Left Cell with Departure Controls */}
                                      <th className="bg-slate-50 border border-slate-100 p-4 min-w-[140px] text-center">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                          {localT.depReturn}
                                        </div>
                                        <div className="flex justify-center items-center gap-2 mt-2">
                                          <button
                                            onClick={() => setDepartureOffset(p => p - 1)}
                                            className="p-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-tarco-blue shadow-sm transition-all"
                                            title="Shift Departure Left"
                                          >
                                            <ChevronLeft size={14} />
                                          </button>
                                          <span className="text-[8px] font-black text-slate-400">DEP</span>
                                          <button
                                            onClick={() => setDepartureOffset(p => p + 1)}
                                            className="p-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-tarco-blue shadow-sm transition-all"
                                            title="Shift Departure Right"
                                          >
                                            <ChevronRight size={14} />
                                          </button>
                                        </div>
                                      </th>
                                      {/* Columns: Departure Dates */}
                                      {depDates.map(d => {
                                        const isSelectedDep = departureDate && d.toDateString() === departureDate.toDateString();
                                        return (
                                          <th
                                            key={d.toISOString()}
                                            className={`border border-slate-100 p-4 text-center min-w-[100px] transition-colors ${
                                              isSelectedDep ? 'bg-tarco-blue/5 text-tarco-blue' : 'bg-slate-50/50 text-slate-600'
                                            }`}
                                          >
                                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                              {d.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG', { weekday: 'short' })}
                                            </div>
                                            <div className="text-xs font-black mt-1">
                                              {d.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG', { day: 'numeric', month: 'short' })}
                                            </div>
                                          </th>
                                        );
                                      })}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {/* Rows: Return Dates */}
                                    {retDates.map(r => {
                                      const isSelectedRet = returnDate && r.toDateString() === returnDate.toDateString();
                                      const isFirstRow = r.toDateString() === retDates[0].toDateString();
                                      const isLastRow = r.toDateString() === retDates[retDates.length - 1].toDateString();

                                      return (
                                        <tr key={r.toISOString()}>
                                          {/* Row Header (Return Date) with vertical controls */}
                                          <td
                                            className={`border border-slate-100 p-4 font-semibold text-center transition-colors ${
                                              isSelectedRet ? 'bg-tarco-blue/5 text-tarco-blue' : 'bg-slate-50/50 text-slate-600'
                                            }`}
                                          >
                                            {isFirstRow && (
                                              <button
                                                onClick={() => setReturnOffset(p => p - 1)}
                                                className="p-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-tarco-blue shadow-sm transition-all mb-1 block mx-auto"
                                                title="Shift Return Up"
                                              >
                                                <ChevronDown className="rotate-180" size={12} />
                                              </button>
                                            )}
                                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                              {r.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG', { weekday: 'short' })}
                                            </div>
                                            <div className="text-xs font-black mt-1">
                                              {r.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG', { day: 'numeric', month: 'short' })}
                                            </div>
                                            {isLastRow && (
                                              <button
                                                onClick={() => setReturnOffset(p => p + 1)}
                                                className="p-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-tarco-blue shadow-sm transition-all mt-1 block mx-auto"
                                                title="Shift Return Down"
                                              >
                                                <ChevronDown size={12} />
                                              </button>
                                            )}
                                          </td>

                                          {/* Intersection Cells */}
                                          {depDates.map(d => {
                                            const price = getCellPrice(d, r, selectedClass);
                                            const isSelectedCell = departureDate && returnDate && d.toDateString() === departureDate.toDateString() && r.toDateString() === returnDate.toDateString();
                                            const isCheapest = cheapest2D.cheapestDep && cheapest2D.cheapestRet && d.toDateString() === cheapest2D.cheapestDep.toDateString() && r.toDateString() === cheapest2D.cheapestRet.toDateString();

                                            if (price === null) {
                                              const isPastDate = d < new Date(new Date().setHours(0,0,0,0)) || r <= d;
                                              const reason = isPastDate
                                                ? (lang === 'en' ? 'Past date or invalid range' : 'تاريخ مضى أو نطاق غير صالح')
                                                : (lang === 'en' ? 'No flights on this date combination' : 'لا رحلات متاحة لهذا التوليف');
                                              return (
                                                <td
                                                  key={d.toISOString()}
                                                  className="border border-slate-100 p-4 text-center bg-slate-50/20 text-slate-300 text-xs font-medium select-none group/cell relative"
                                                  title={reason}
                                                  aria-label={`${localT.notAvailable}: ${reason}`}
                                                >
                                                  <span className="select-none">{localT.notAvailable}</span>
                                                  {/* Tooltip */}
                                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-opacity duration-150 z-10">
                                                    {reason}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                                                  </div>
                                                </td>
                                              );
                                            }

                                            return (
                                              <td
                                                key={d.toISOString()}
                                                onClick={() => handleCellClick(d, r)}
                                                className={`border p-4 text-center cursor-pointer transition-all relative ${
                                                  isSelectedCell
                                                    ? 'border-tarco-blue bg-tarco-blue/5 shadow-inner ring-2 ring-tarco-blue ring-inset'
                                                    : 'border-slate-100 hover:bg-slate-50'
                                                }`}
                                              >
                                                <div className={`text-sm font-black ${isSelectedCell ? 'text-tarco-blue' : 'text-slate-700'}`}>
                                                  {formatPrice(price)}
                                                </div>
                                                {isCheapest && (
                                                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[7px] font-black uppercase rounded-full">
                                                    {localT.cheapest}
                                                  </span>
                                                )}
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              /* 1D Departure Strip (One-Way) */
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    {lang === 'en' ? 'Shift Days' : 'إزاحة الأيام'}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setDepartureOffset(p => p - 1)}
                                      className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-tarco-blue shadow-sm transition-all"
                                      title="Shift Dates Left"
                                    >
                                      <ChevronLeft size={16} />
                                    </button>
                                    <button
                                      onClick={() => setDepartureOffset(p => p + 1)}
                                      className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-tarco-blue shadow-sm transition-all"
                                      title="Shift Dates Right"
                                    >
                                      <ChevronRight size={16} />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                                  {depDates.map(d => {
                                    const price = getCellPrice(d, null, selectedClass);
                                    const isSelected = departureDate && d.toDateString() === departureDate.toDateString();
                                    const isCheapest = cheapest1D.cheapestDep && d.toDateString() === cheapest1D.cheapestDep.toDateString();

                                    if (price === null) {
                                      return (
                                        <div key={d.toISOString()} className="border border-slate-100 bg-slate-50/50 p-4 rounded-2xl text-center text-slate-300 text-xs font-semibold select-none">
                                          <div className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">
                                            {d.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG', { weekday: 'short', day: 'numeric' })}
                                          </div>
                                          {localT.notAvailable}
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        key={d.toISOString()}
                                        onClick={() => {
                                          setDepartureDate(d);
                                          setDepartureOffset(0);
                                        }}
                                        className={`border p-4 rounded-2xl text-center cursor-pointer transition-all ${
                                          isSelected
                                            ? 'border-tarco-blue bg-tarco-blue/5 shadow-md ring-2 ring-tarco-blue'
                                            : 'border-slate-100 bg-white hover:border-slate-200'
                                        }`}
                                      >
                                        <div className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-tarco-blue' : 'text-slate-400'}`}>
                                          {d.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG', { weekday: 'short', day: 'numeric' })}
                                        </div>
                                        <div className={`text-base font-black mt-2 ${isSelected ? 'text-tarco-blue' : 'text-slate-700'}`}>
                                          {formatPrice(price)}
                                        </div>
                                        {isCheapest && (
                                          <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-extrabold uppercase rounded-full">
                                            {localT.cheapest}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Dynamic Fare Cards Selection (Mobile only, hidden on desktop) */}
                          <div className="lg:hidden grid grid-cols-1 md:grid-cols-3 gap-6">
                            {FARES.map((fare, idx) => {
                              const dynamicPrice = getFarePrice(fare.id, selectedCellPrice);
                              const isSelected = selectedFare?.id === fare.id;

                              return (
                                <FareCard
                                  key={fare.id}
                                  fare={fare}
                                  dynamicPrice={dynamicPrice}
                                  isSelected={isSelected}
                                  lang={lang}
                                  onClick={() => {
                                    const targetClass = fare.id === 'business' ? 'business' : 'economy';
                                    setSelectedClass(targetClass);
                                    setSelectedFare({ ...fare, price: dynamicPrice });
                                  }}
                                  t={t}
                                  formatPrice={formatPrice}
                                  delayIndex={idx}
                                />
                              );
                            })}
                          </div>

                          {/* Navigation Buttons */}
                          <div className="flex justify-between items-center pt-8 border-t border-slate-200">
                            <button onClick={() => setStep('search')} className="text-slate-400 font-bold transition-colors duration-150 hover:text-tarco-navy">{t.results.back}</button>
                            <button
                              disabled={!selectedFare}
                              onClick={nextStep}
                              className={`px-12 py-4 rounded-2xl font-bold shadow-lg transition-[background-color,transform,box-shadow] duration-150 ${
                                selectedFare
                                  ? 'bg-tarco-red text-white hover:bg-red-600 active:scale-[0.97]'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                              {t.results.continue}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}

                {step === 'passengers' && (
                  <motion.div
                    key="passengers"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8 animate-fade"
                  >
                    {renderBookingHeader()}

                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-tarco-navy">{t.passengersDetails.title}</h2>
                      <p className="text-slate-500">{t.passengersDetails.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      {/* Main content: Passenger info cards */}
                      <div className="lg:col-span-9 space-y-8 min-w-0">
                        <div className="space-y-6">
                          {passengerDetails.map((pax, idx) => {
                            const isLead = idx === 0;
                            const genderOptions = [
                              { value: 'Male', label: t.passengersDetails.male },
                              { value: 'Female', label: t.passengersDetails.female }
                            ];
                            const titleOptions = pax.type === 'adult' 
                              ? ['Mr', 'Mrs', 'Ms'] 
                              : ['Mstr', 'Miss'];

                            return (
                              <div
                                key={idx}
                                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md space-y-6 relative overflow-hidden"
                              >
                                {/* Card Header with Badge */}
                                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-tarco-blue/5 text-tarco-blue flex items-center justify-center font-bold">
                                      {idx + 1}
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-tarco-navy">
                                        {t.passengersDetails.passengerNum.replace('{num}', String(idx + 1))}
                                        {isLead && ` - ${t.passengersDetails.leadPassenger}`}
                                      </h3>
                                      <span className="text-[10px] px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full font-bold uppercase tracking-wider">
                                        {pax.type === 'adult' ? t.passengersDetails.adult : pax.type === 'child' ? t.passengersDetails.child : t.passengersDetails.infant}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Form fields grid */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                  {/* Title Select */}
                                  <div className="md:col-span-3 flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.passengersDetails.titleLabel}</label>
                                    <select
                                      value={pax.title}
                                      onChange={(e) => {
                                        const updated = [...passengerDetails];
                                        updated[idx].title = e.target.value;
                                        setPassengerDetails(updated);
                                      }}
                                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-tarco-blue transition-colors font-medium cursor-pointer"
                                    >
                                      {titleOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* First Name */}
                                  <div className="md:col-span-4 flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.passengersDetails.firstName}</label>
                                    <input
                                      id={`pax_${idx}_firstName`}
                                      type="text"
                                      value={pax.firstName}
                                      onChange={(e) => {
                                        const updated = [...passengerDetails];
                                        updated[idx].firstName = e.target.value;
                                        setPassengerDetails(updated);
                                        if (passengerErrors[`pax_${idx}_firstName`]) {
                                          const errorsCopy = { ...passengerErrors };
                                          delete errorsCopy[`pax_${idx}_firstName`];
                                          setPassengerErrors(errorsCopy);
                                        }
                                      }}
                                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:border-tarco-blue transition-colors font-medium ${
                                        passengerErrors[`pax_${idx}_firstName`] ? 'border-red-500 bg-red-50/10' : 'border-slate-200'
                                      }`}
                                    />
                                    {passengerErrors[`pax_${idx}_firstName`] && (
                                      <span className="text-xs text-red-500 font-semibold">{passengerErrors[`pax_${idx}_firstName`]}</span>
                                    )}
                                  </div>

                                  {/* Last Name */}
                                  <div className="md:col-span-5 flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.passengersDetails.lastName}</label>
                                    <input
                                      id={`pax_${idx}_lastName`}
                                      type="text"
                                      value={pax.lastName}
                                      onChange={(e) => {
                                        const updated = [...passengerDetails];
                                        updated[idx].lastName = e.target.value;
                                        setPassengerDetails(updated);
                                        if (passengerErrors[`pax_${idx}_lastName`]) {
                                          const errorsCopy = { ...passengerErrors };
                                          delete errorsCopy[`pax_${idx}_lastName`];
                                          setPassengerErrors(errorsCopy);
                                        }
                                      }}
                                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:border-tarco-blue transition-colors font-medium ${
                                        passengerErrors[`pax_${idx}_lastName`] ? 'border-red-500 bg-red-50/10' : 'border-slate-200'
                                      }`}
                                    />
                                    {passengerErrors[`pax_${idx}_lastName`] && (
                                      <span className="text-xs text-red-500 font-semibold">{passengerErrors[`pax_${idx}_lastName`]}</span>
                                    )}
                                  </div>

                                  {/* Gender Select */}
                                  <div className="md:col-span-3 flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.passengersDetails.gender}</label>
                                    <select
                                      value={pax.gender}
                                      onChange={(e) => {
                                        const updated = [...passengerDetails];
                                        updated[idx].gender = e.target.value;
                                        setPassengerDetails(updated);
                                      }}
                                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-tarco-blue transition-colors font-medium cursor-pointer"
                                    >
                                      {genderOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Date of Birth */}
                                  <div className="md:col-span-4 flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.passengersDetails.dob}</label>
                                    <input
                                      id={`pax_${idx}_dateOfBirth`}
                                      type="date"
                                      value={pax.dateOfBirth}
                                      onChange={(e) => {
                                        const updated = [...passengerDetails];
                                        updated[idx].dateOfBirth = e.target.value;
                                        setPassengerDetails(updated);
                                        if (passengerErrors[`pax_${idx}_dateOfBirth`]) {
                                          const errorsCopy = { ...passengerErrors };
                                          delete errorsCopy[`pax_${idx}_dateOfBirth`];
                                          setPassengerErrors(errorsCopy);
                                        }
                                      }}
                                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:border-tarco-blue transition-colors font-medium ${
                                        passengerErrors[`pax_${idx}_dateOfBirth`] ? 'border-red-500 bg-red-50/10' : 'border-slate-200'
                                      }`}
                                    />
                                    {passengerErrors[`pax_${idx}_dateOfBirth`] && (
                                      <span className="text-xs text-red-500 font-semibold">{passengerErrors[`pax_${idx}_dateOfBirth`]}</span>
                                    )}
                                  </div>

                                  {/* Nationality */}
                                  <div className="md:col-span-5 flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.passengersDetails.nationality}</label>
                                    <select
                                      value={pax.nationality}
                                      onChange={(e) => {
                                        const updated = [...passengerDetails];
                                        updated[idx].nationality = e.target.value;
                                        setPassengerDetails(updated);
                                      }}
                                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-tarco-blue transition-colors font-medium cursor-pointer"
                                    >
                                      <option value="Sudanese">{lang === 'en' ? 'Sudanese' : 'سوداني'}</option>
                                      <option value="Egyptian">{lang === 'en' ? 'Egyptian' : 'مصري'}</option>
                                      <option value="Saudi">{lang === 'en' ? 'Saudi' : 'سعودي'}</option>
                                      <option value="Emirati">{lang === 'en' ? 'Emirati' : 'إماراتي'}</option>
                                      <option value="Qatari">{lang === 'en' ? 'Qatari' : 'قطري'}</option>
                                      <option value="Turkish">{lang === 'en' ? 'Turkish' : 'تركي'}</option>
                                      <option value="British">{lang === 'en' ? 'British' : 'بريطاني'}</option>
                                      <option value="American">{lang === 'en' ? 'American' : 'أمريكي'}</option>
                                    </select>
                                  </div>

                                  {/* Passport Number */}
                                  <div className="md:col-span-6 flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.passengersDetails.passportNumber}</label>
                                    <input
                                      id={`pax_${idx}_passportNumber`}
                                      type="text"
                                      placeholder="e.g. P000000"
                                      value={pax.passportNumber}
                                      onChange={(e) => {
                                        const updated = [...passengerDetails];
                                        updated[idx].passportNumber = e.target.value.toUpperCase();
                                        setPassengerDetails(updated);
                                        if (passengerErrors[`pax_${idx}_passportNumber`]) {
                                          const errorsCopy = { ...passengerErrors };
                                          delete errorsCopy[`pax_${idx}_passportNumber`];
                                          setPassengerErrors(errorsCopy);
                                        }
                                      }}
                                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:border-tarco-blue transition-colors font-medium ${
                                        passengerErrors[`pax_${idx}_passportNumber`] ? 'border-red-500 bg-red-50/10' : 'border-slate-200'
                                      }`}
                                    />
                                    {passengerErrors[`pax_${idx}_passportNumber`] && (
                                      <span className="text-xs text-red-500 font-semibold">{passengerErrors[`pax_${idx}_passportNumber`]}</span>
                                    )}
                                  </div>

                                  {/* Passport Expiry Date */}
                                  <div className="md:col-span-6 flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.passengersDetails.passportExpiry}</label>
                                    <input
                                      id={`pax_${idx}_passportExpiry`}
                                      type="date"
                                      value={pax.passportExpiry}
                                      onChange={(e) => {
                                        const updated = [...passengerDetails];
                                        updated[idx].passportExpiry = e.target.value;
                                        setPassengerDetails(updated);
                                        if (passengerErrors[`pax_${idx}_passportExpiry`]) {
                                          const errorsCopy = { ...passengerErrors };
                                          delete errorsCopy[`pax_${idx}_passportExpiry`];
                                          setPassengerErrors(errorsCopy);
                                        }
                                      }}
                                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:border-tarco-blue transition-colors font-medium ${
                                        passengerErrors[`pax_${idx}_passportExpiry`] ? 'border-red-500 bg-red-50/10' : 'border-slate-200'
                                      }`}
                                    />
                                    {passengerErrors[`pax_${idx}_passportExpiry`] && (
                                      <span className="text-xs text-red-500 font-semibold">{passengerErrors[`pax_${idx}_passportExpiry`]}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Contact Info Card */}
                          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                              <div className="w-10 h-10 rounded-full bg-tarco-blue/5 text-tarco-blue flex items-center justify-center font-bold">
                                <Mail size={20} />
                              </div>
                              <h3 className="font-bold text-tarco-navy">{t.passengersDetails.contactInfo}</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Email */}
                              <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.passengersDetails.email}</label>
                                <input
                                  id="contact_email"
                                  type="email"
                                  placeholder="passenger@example.com"
                                  value={contactEmail}
                                  onChange={(e) => {
                                    setContactEmail(e.target.value);
                                    if (passengerErrors['contact_email']) {
                                      const errorsCopy = { ...passengerErrors };
                                      delete errorsCopy['contact_email'];
                                      setPassengerErrors(errorsCopy);
                                    }
                                  }}
                                  className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:border-tarco-blue transition-colors font-medium ${
                                    passengerErrors['contact_email'] ? 'border-red-500 bg-red-50/10' : 'border-slate-200'
                                  }`}
                                />
                                {passengerErrors['contact_email'] && (
                                  <span className="text-xs text-red-500 font-semibold">{passengerErrors['contact_email']}</span>
                                )}
                              </div>

                              {/* Phone */}
                              <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.passengersDetails.phone}</label>
                                <input
                                  id="contact_phone"
                                  type="tel"
                                  placeholder="e.g. +249 912345678"
                                  value={contactPhone}
                                  onChange={(e) => {
                                    setContactPhone(e.target.value);
                                    if (passengerErrors['contact_phone']) {
                                      const errorsCopy = { ...passengerErrors };
                                      delete errorsCopy['contact_phone'];
                                      setPassengerErrors(errorsCopy);
                                    }
                                  }}
                                  className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:border-tarco-blue transition-colors font-medium ${
                                    passengerErrors['contact_phone'] ? 'border-red-500 bg-red-50/10' : 'border-slate-200'
                                  }`}
                                />
                                {passengerErrors['contact_phone'] && (
                                  <span className="text-xs text-red-500 font-semibold">{passengerErrors['contact_phone']}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Back / Navigation CTA */}
                        <div className="flex justify-between items-center pt-8 border-t border-slate-200">
                          <button
                            onClick={() => setStep('results')}
                            className="text-slate-400 font-bold hover:text-tarco-navy transition-colors duration-150 flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                          >
                            {lang === 'en' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                            {t.passengersDetails.back}
                          </button>
                        </div>
                      </div>

                      {/* Sidebar summary panel */}
                      <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6 sticky top-24">
                          <h3 className="text-xl font-bold text-tarco-navy">{t.seats.summary}</h3>

                          <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t.seats.fare} ({selectedFare?.id === 'lite' ? t.fares.lite : selectedFare?.id === 'semi' ? t.fares.semi : t.fares.business})</span>
                              <span className="font-bold text-tarco-navy">{selectedFare ? formatPrice(selectedFare.price) : ''}</span>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                              <span className="font-bold text-tarco-navy">{t.seats.total}</span>
                              <span className="text-3xl font-black text-tarco-navy">
                                {formatPrice(getBookingTotal())}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-50">
                            <ShieldCheck size={16} className="text-emerald-500" />
                            {t.seats.secure}
                          </div>

                          <button
                            onClick={nextStep}
                            className="w-full py-4 bg-tarco-red hover:bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-900/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                          >
                            {t.passengersDetails.continue}
                            {lang === 'en' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'services' && (
                  <motion.div
                    key="services"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8 animate-fade"
                  >
                    {renderBookingHeader()}

                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-tarco-navy">{t.services.title}</h2>
                      <p className="text-slate-500">{t.services.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      {/* Main content: Extra Services selection */}
                      <div className="lg:col-span-9 space-y-8 min-w-0">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {EXTRA_SERVICES.map((service) => (
                            <motion.div
                              key={service.id}
                              whileHover={{ scale: 1.02 }}
                              onClick={() => toggleService(service.id)}
                              className={`p-6 rounded-3xl border-2 cursor-pointer transition-all flex items-center gap-6 ${selectedServices.includes(service.id)
                                  ? 'border-tarco-blue bg-white shadow-xl'
                                  : 'border-slate-100 bg-white hover:border-slate-200'
                                }`}
                            >
                              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${selectedServices.includes(service.id) ? 'bg-tarco-blue text-white' : 'bg-slate-50 text-slate-400'}`}>
                                <service.icon size={32} />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-bold text-tarco-blue">{t.serviceItems[service.id as keyof typeof t.serviceItems].name}</h3>
                                <p className="text-xs text-slate-400">{t.serviceItems[service.id as keyof typeof t.serviceItems].desc}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-black text-tarco-blue">{formatPrice(service.price)}</p>
                                <div className={`w-6 h-6 rounded-full border-2 mt-2 flex items-center justify-center transition-all ${selectedServices.includes(service.id) ? 'bg-tarco-red border-tarco-red' : 'border-slate-200'}`}>
                                  {selectedServices.includes(service.id) && <Check size={14} className="text-white" />}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {/* Navigation back button */}
                        <div className="flex justify-between items-center pt-8 border-t border-slate-200">
                          <button
                            onClick={() => setStep('passengers')}
                            className="text-slate-400 font-bold hover:text-tarco-navy transition-colors duration-150 flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                          >
                            {lang === 'en' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                            {lang === 'en' ? 'Back to Passengers' : 'العودة للمسافرين'}
                          </button>
                        </div>
                      </div>

                      {/* Sidebar summary panel */}
                      <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6 sticky top-24">
                          <h3 className="text-xl font-bold text-tarco-navy">{t.seats.summary}</h3>

                          <div className="space-y-4">
                            {/* Selected Fare Class */}
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t.seats.fare} ({selectedFare?.id === 'lite' ? t.fares.lite : selectedFare?.id === 'semi' ? t.fares.semi : t.fares.business})</span>
                              <span className="font-bold text-tarco-navy">{selectedFare ? formatPrice(selectedFare.price) : ''}</span>
                            </div>

                            {/* Extra Services List */}
                            {selectedServices.length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-slate-50">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-wider">{t.seats.extra}</p>
                                {selectedServices.map(id => {
                                  const s = EXTRA_SERVICES.find(x => x.id === id);
                                  return (
                                    <div key={id} className="flex justify-between text-sm">
                                      <span className="text-slate-500">{t.serviceItems[id as keyof typeof t.serviceItems].name}</span>
                                      <span className="font-bold text-tarco-navy">{s ? formatPrice(s.price) : ''}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Running Total */}
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                              <span className="font-bold text-tarco-navy">{t.seats.total}</span>
                              <span className="text-3xl font-black text-tarco-navy">
                                {formatPrice(getBookingTotal())}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-50">
                            <ShieldCheck size={16} className="text-emerald-500" />
                            {t.seats.secure}
                          </div>

                          <button
                            onClick={nextStep}
                            className="w-full py-4 bg-tarco-red hover:bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-900/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                          >
                            {t.services.continue}
                            {lang === 'en' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'seats' && (
                  <motion.div
                    key="seats"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8 animate-fade"
                  >
                    {renderBookingHeader()}

                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-tarco-navy">{t.seats.title}</h2>
                      <p className="text-slate-500">{t.seats.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      {/* Main content: Seat Selection */}
                      <div className="lg:col-span-9 space-y-8 min-w-0">

                        {/* Seat Map */}
                        <div className="bg-white rounded-3xl sm:rounded-[40px] p-4 sm:p-12 shadow-xl border border-slate-100 relative overflow-hidden">
                          {/* Airplane Shape Decoration */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[400px] h-full bg-slate-50/50 rounded-t-[200px] border-x border-slate-100 pointer-events-none">
                            {/* Cockpit Area */}
                            <div className="absolute top-0 left-0 right-0 h-48 bg-slate-100/50 rounded-t-[200px] border-b border-slate-200 flex flex-col items-center justify-center gap-2">
                              <div className="flex gap-4 sm:gap-8">
                                <div className="w-12 sm:w-16 h-6 sm:h-8 bg-slate-200 rounded-tl-full" />
                                <div className="w-12 sm:w-16 h-6 sm:h-8 bg-slate-200 rounded-tr-full" />
                              </div>
                              <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">{t.seats.deck}</span>
                            </div>
                          </div>

                          <div className="relative z-10 space-y-2 sm:space-y-4 max-w-sm sm:max-w-md mx-auto pt-48">
                            {/* Column Labels */}
                            <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-8 text-center text-[10px] font-black text-slate-300">
                              <span>A</span><span>B</span><span>C</span><span className="opacity-0">|</span><span>D</span><span>E</span><span>F</span>
                            </div>

                            {SEATS.map((row, rowIndex) => (
                              <div key={rowIndex} className="grid grid-cols-7 gap-2 sm:gap-3 items-center">
                                {row.map((seat, colIndex) => (
                                  <React.Fragment key={seat.id}>
                                    {colIndex === 3 && (
                                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-300">
                                        {rowIndex + 1}
                                      </div>
                                    )}
                                    <motion.button
                                      whileHover={seat.type !== 'occupied' ? { scale: 1.1 } : {}}
                                      whileTap={seat.type !== 'occupied' ? { scale: 0.95 } : {}}
                                      disabled={seat.type === 'occupied'}
                                      onClick={() => setSelectedSeat(seat)}
                                      className={`relative aspect-square rounded-lg flex items-center justify-center transition-all ${seat.type === 'occupied'
                                          ? 'bg-slate-200 cursor-not-allowed text-slate-400'
                                          : selectedSeat?.id === seat.id
                                            ? 'bg-tarco-red text-white shadow-lg shadow-red-200'
                                            : seat.price > 0
                                              ? 'bg-tarco-navy text-white hover:bg-tarco-navy/90'
                                              : 'bg-blue-50 text-tarco-blue hover:bg-blue-100'
                                        }`}
                                    >
                                      <Armchair className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      {selectedSeat?.id === seat.id && seat.price > 0 && (
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20"
                                        >
                                          {lang === 'en' ? 'Legroom' : 'مساحة إضافية'}: +{formatPrice(seat.price)}
                                        </motion.div>
                                      )}
                                    </motion.button>
                                  </React.Fragment>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Navigation back button */}
                        <div className="flex justify-between items-center pt-8 border-t border-slate-200">
                          <button
                            onClick={() => setStep('services')}
                            className="text-slate-400 font-bold hover:text-tarco-navy transition-colors duration-150 flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                          >
                            {lang === 'en' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                            {lang === 'en' ? 'Back to Services' : 'العودة للخدمات'}
                          </button>
                        </div>
                      </div>

                      {/* Sidebar summary panel */}
                      <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6 sticky top-24">
                          <h3 className="text-xl font-bold text-tarco-navy">{t.seats.summary}</h3>

                          <div className="space-y-4">
                            {/* Selected Fare Class */}
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">{t.seats.fare} ({selectedFare?.id === 'lite' ? t.fares.lite : selectedFare?.id === 'semi' ? t.fares.semi : t.fares.business})</span>
                              <span className="font-bold text-tarco-navy">{selectedFare ? formatPrice(selectedFare.price) : ''}</span>
                            </div>

                            {/* Extra Services List */}
                            {selectedServices.length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-slate-50">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-wider">{t.seats.extra}</p>
                                {selectedServices.map(id => {
                                  const s = EXTRA_SERVICES.find(x => x.id === id);
                                  return (
                                    <div key={id} className="flex justify-between text-sm">
                                      <span className="text-slate-500">{t.serviceItems[id as keyof typeof t.serviceItems].name}</span>
                                      <span className="font-bold text-tarco-navy">{s ? formatPrice(s.price) : ''}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Selected Seat */}
                            {selectedSeat && (
                              <div className="flex justify-between text-sm pt-2 border-t border-slate-50">
                                <span className="text-slate-500">{t.seats.seat} {selectedSeat.label}</span>
                                <span className="font-bold text-tarco-navy">{formatPrice(selectedSeat.price)}</span>
                              </div>
                            )}

                            {/* Running Total */}
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                              <span className="font-bold text-tarco-navy">{t.seats.total}</span>
                              <span className="text-3xl font-black text-tarco-navy">
                                {formatPrice(getBookingTotal())}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-50">
                            <ShieldCheck size={16} className="text-emerald-500" />
                            {t.seats.secure}
                          </div>

                          <button
                            onClick={nextStep}
                            disabled={!selectedSeat}
                            className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-widest ${
                              selectedSeat
                                ? 'bg-tarco-red hover:bg-red-600 text-white shadow-red-900/10 active:scale-95'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {t.seats.confirm}
                            {lang === 'en' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'success' && (() => {
                  const getPaxZone = (seatLabel: string) => {
                    const isEn = lang === 'en';
                    if (selectedFare?.id === 'business') return isEn ? '1 (Priority)' : '١ (أولوية)';
                    const letter = seatLabel.slice(-1);
                    if (['A', 'F'].includes(letter)) return isEn ? '2 (Window)' : '٢ (نافذة)';
                    if (['B', 'E'].includes(letter)) return isEn ? '3 (Middle)' : '٣ (وسط)';
                    return isEn ? '4 (Aisle)' : '٤ (ممر)';
                  };

                  const Barcode = () => {
                    const linePattern = [1, 2, 1, 4, 1, 2, 3, 1, 2, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 1, 3, 2, 1, 4, 1, 2, 1, 1, 3, 2, 1, 4, 1, 2, 1];
                    return (
                      <div className="flex items-center justify-center h-12 w-full bg-white px-4">
                        {linePattern.map((width, idx) => (
                          <div
                            key={idx}
                            className="h-full bg-slate-800"
                            style={{
                              width: `${width}px`,
                              marginRight: idx % 3 === 0 ? '2px' : '1px',
                              opacity: idx % 7 === 0 ? 0.7 : 1
                            }}
                          />
                        ))}
                      </div>
                    );
                  };

                  const isOutbound = selectedSuccessDirection === 'outbound';
                  const boardingFromCode = isOutbound ? fromCity.code : toCity.code;
                  const boardingFromName = isOutbound ? fromCity.name[lang] : toCity.name[lang];
                  const boardingToCode = isOutbound ? toCity.code : fromCity.code;
                  const boardingToName = isOutbound ? toCity.name[lang] : fromCity.name[lang];
                  
                  const boardingFlight = isOutbound ? 'TRC 402' : 'TRC 403';
                  const boardingGate = isOutbound ? 'B12' : 'C08';
                  const boardingTime = isOutbound ? '07:45' : '13:30';
                  const departureTime = isOutbound ? '08:30' : '14:15';
                  
                  const activeFlightDate = isOutbound ? departureDate : returnDate;
                  const boardingDateStr = activeFlightDate
                    ? activeFlightDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()
                    : '14 APR 26';

                  const pnrCode = "TRC" + (passengerDetails[0]?.lastName ? passengerDetails[0].lastName.substring(0, 3).toUpperCase() : "PAX");
                  const activeSeatLabel = getPaxSeatLabel(selectedSuccessPaxIdx);
                  const activePax = passengerDetails[selectedSuccessPaxIdx];
                  const activePaxType = activePax?.type || 'adult';

                  // Calculate dynamic baggage allowance
                  const getBaggageAllowance = () => {
                    const isEn = lang === 'en';
                    const hasExtraBag = selectedServices.includes('baggage');
                    if (selectedFare?.id === 'lite') {
                      return hasExtraBag
                        ? (isEn ? '23KG + 7KG Hand' : '٢٣ كجم + ٧ كجم يد')
                        : (isEn ? '7KG Hand Only' : '٧ كجم يد فقط');
                    } else if (selectedFare?.id === 'semi') {
                      return hasExtraBag
                        ? (isEn ? '2x 23KG + 7KG' : '٢ × ٢٣ كجم + ٧ كجم')
                        : (isEn ? '23KG + 7KG Hand' : '٢٣ كجم + ٧ كجم يد');
                    } else {
                      // Business
                      return hasExtraBag
                        ? (isEn ? '3x 23KG + 7KG' : '٣ × ٢٣ كجم + ٧ كجم')
                        : (isEn ? '2x 23KG + 7KG' : '٢ × ٢٣ كجم + ٧ كجم');
                    }
                  };

                  const depDateStr = departureDate
                    ? departureDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
                    : (lang === 'en' ? 'April 14, 2026' : '١٤ أبريل ٢٠٢٦');

                  const subtitleText = t.success.subtitle
                    .replace('{to}', to)
                    .replace('April 14th', depDateStr)
                    .replace('14 أبريل', depDateStr);

                  return (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-12 space-y-8 success-print-container"
                    >
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 emerald-checkmark">
                          <Check size={40} />
                        </div>
                        <h2 className="text-4xl font-black text-tarco-navy">{t.success.title}</h2>
                        <p className="text-slate-500 max-w-md mx-auto">{subtitleText}</p>
                      </div>

                      {/* Passenger Selector for boarding pass */}
                      {passengerDetails.length > 1 && (
                        <div className="w-full max-w-sm overflow-x-auto no-scrollbar pb-2 no-print-pax-selector">
                          <div className="flex gap-2 justify-start sm:justify-center min-w-max px-4">
                            {passengerDetails.map((pax, idx) => (
                              <button
                                key={idx}
                                onClick={() => setSelectedSuccessPaxIdx(idx)}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                                  selectedSuccessPaxIdx === idx
                                    ? 'bg-tarco-red text-white shadow-md shadow-red-900/10'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {pax.firstName && pax.lastName ? `${pax.firstName.charAt(0)}. ${pax.lastName}` : `Pax ${idx + 1}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Outbound / Return Selector */}
                      {isRoundTrip && (
                        <div className="flex bg-slate-100 p-1 rounded-2xl w-full max-w-sm mb-4 no-print-trip-selector">
                          <button
                            onClick={() => setSelectedSuccessDirection('outbound')}
                            className={`flex-grow py-2.5 rounded-xl text-xs font-black transition-all ${
                              selectedSuccessDirection === 'outbound'
                                ? 'bg-white text-tarco-navy shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {lang === 'en' ? 'Outbound Flight' : 'رحلة الذهاب'}
                          </button>
                          <button
                            onClick={() => setSelectedSuccessDirection('return')}
                            className={`flex-grow py-2.5 rounded-xl text-xs font-black transition-all ${
                              selectedSuccessDirection === 'return'
                                ? 'bg-white text-tarco-navy shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {lang === 'en' ? 'Return Flight' : 'رحلة العودة'}
                          </button>
                        </div>
                      )}

                      {/* Digital Boarding Pass Wrapper (Concentric Double-Bezel) */}
                      <div className="w-full max-w-sm p-3 rounded-[36px] bg-slate-100/90 border border-slate-200/50 shadow-[0_24px_48px_-15px_rgba(4,20,56,0.12)] backdrop-blur-md printable-ticket relative overflow-hidden transition-all duration-300">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={`${selectedSuccessPaxIdx}-${selectedSuccessDirection}`}
                            initial={{ y: 15, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -15, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                            className="w-full bg-white rounded-[26px] overflow-visible border border-slate-100/80 relative shadow-sm ticket-card"
                          >
                            {/* Upper ticket stub */}
                            <div className="bg-gradient-to-br from-tarco-blue via-[#173a8f] to-tarco-navy p-8 text-white space-y-6 relative overflow-hidden rounded-t-[25px]">
                              {/* Decorative background watermark plane */}
                              <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none select-none">
                                <Plane className="w-40 h-40 transform -rotate-45" />
                              </div>

                              <div className="flex justify-between items-center relative z-10">
                                <div className="flex items-center gap-2">
                                  <img
                                    src="/Images/TRC.svg"
                                    alt=""
                                    className="h-6 w-auto brightness-0 invert"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <div className="flex flex-col leading-none">
                                    <div className="flex items-center gap-0.5">
                                      <span className="font-black tracking-tighter text-tarco-red text-base">TARCO</span>
                                      <span className="font-black tracking-tighter text-white text-base">AVIATION</span>
                                    </div>
                                    <span className="text-[6px] font-black text-tarco-red uppercase tracking-widest mt-0.5">The Legend of Africa</span>
                                  </div>
                                </div>
                                <span className={`text-[9px] px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                                  selectedFare?.id === 'business'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)] font-black'
                                    : 'bg-white/10 text-white border border-white/10'
                                }`}>
                                  {selectedFare?.id === 'business' && '✦ '}
                                  {selectedFare?.id === 'lite' ? t.fares.lite : selectedFare?.id === 'semi' ? t.fares.semi : t.fares.business}
                                </span>
                              </div>

                              <div className="flex justify-between items-center pt-2 relative z-10">
                                <div className="space-y-0.5 text-start">
                                  <h4 className="text-4xl font-black tracking-tight">{boardingFromCode}</h4>
                                  <p className="text-[9px] font-bold opacity-60 uppercase tracking-wider">{boardingFromName}</p>
                                </div>
                                <div className="flex flex-col items-center flex-grow px-4">
                                  <div className="w-full flex items-center justify-center gap-2 relative">
                                    <div className="h-[1.5px] bg-white/20 flex-grow rounded-full"></div>
                                    <Plane size={14} className={`text-tarco-red transform transition-transform duration-500 ${lang === 'en' ? 'rotate-90' : '-rotate-90'}`} />
                                    <div className="h-[1.5px] bg-white/20 flex-grow rounded-full"></div>
                                  </div>
                                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest mt-1">Non-Stop</span>
                                </div>
                                <div className="text-end space-y-0.5">
                                  <h4 className="text-4xl font-black tracking-tight">{boardingToCode}</h4>
                                  <p className="text-[9px] font-bold opacity-60 uppercase tracking-wider">{boardingToName}</p>
                                </div>
                              </div>
                            </div>

                            {/* Perforated teardrop separator */}
                            <div className="relative h-6 bg-white select-none overflow-visible">
                              {/* Left cutout */}
                              <div className="cutout absolute -left-3 top-0 w-6 h-6 bg-slate-100/90 rounded-full border border-slate-200/40 shadow-[inset_-3px_0_5px_rgba(0,0,0,0.01)] z-10"></div>
                              {/* Dashed line */}
                              <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-200"></div>
                              {/* Right cutout */}
                              <div className="cutout absolute -right-3 top-0 w-6 h-6 bg-slate-100/90 rounded-full border border-slate-200/40 shadow-[inset_3px_0_5px_rgba(0,0,0,0.01)] z-10"></div>
                            </div>

                            {/* Lower ticket stub */}
                            <div className="px-8 pb-8 pt-2 space-y-8 text-start print:rounded-b-[25px]">
                              <div className="grid grid-cols-3 gap-y-5 gap-x-2">
                                {/* Row 1 */}
                                <div className="col-span-2">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t.success.passenger}</p>
                                  <p className="font-extrabold text-tarco-navy truncate">
                                    {activePax
                                      ? `${activePax.firstName} ${activePax.lastName}`
                                      : 'Traveler Name'}
                                  </p>
                                </div>
                                <div className="text-end">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t.success.flight}</p>
                                  <p className="font-black text-tarco-navy">{boardingFlight}</p>
                                </div>

                                {/* Row 2 */}
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t.booking.date}</p>
                                  <p className="font-bold text-tarco-navy text-xs sm:text-sm">{boardingDateStr}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'Gate' : 'البوابة'}</p>
                                  <p className="font-black text-tarco-navy">{boardingGate}</p>
                                </div>
                                <div className="text-end">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'Boarding' : 'الصعود'}</p>
                                  <p className="font-black text-tarco-red">{boardingTime}</p>
                                </div>

                                {/* Row 3 */}
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t.seats.seat}</p>
                                  <p className="font-black text-tarco-navy text-lg leading-none">{activeSeatLabel}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'Class' : 'الدرجة'}</p>
                                  <p className="font-bold text-tarco-navy text-xs truncate">
                                    {selectedFare?.id === 'lite' ? t.fares.lite : selectedFare?.id === 'semi' ? t.fares.semi : t.fares.business}
                                  </p>
                                </div>
                                <div className="text-end">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'Zone' : 'المنطقة'}</p>
                                  <p className="font-black text-tarco-navy">{getPaxZone(activeSeatLabel)}</p>
                                </div>

                                {/* Row 4 - NEW DETAILS */}
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'Type' : 'الفئة'}</p>
                                  <p className="font-bold text-tarco-navy text-xs uppercase">
                                    {activePaxType === 'adult' ? (lang === 'en' ? 'Adult' : 'بالغ') : activePaxType === 'child' ? (lang === 'en' ? 'Child' : 'طفل') : (lang === 'en' ? 'Infant' : 'رضيع')}
                                  </p>
                                </div>
                                <div className="col-span-2 text-end">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'Baggage' : 'الأمتعة'}</p>
                                  <p className="font-bold text-tarco-navy text-xs truncate">{getBaggageAllowance()}</p>
                                </div>
                              </div>

                              <div className="border-t border-slate-100 pt-6 flex flex-col items-center gap-6">
                                {/* QR Code Container */}
                                <div className="relative group p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer overflow-hidden transition-all duration-300 hover:bg-slate-100/50">
                                  <QrCode size={110} className="text-tarco-navy transition-transform duration-300 group-hover:scale-105" />
                                  <div className="absolute left-0 right-0 h-[2px] bg-tarco-red/80 shadow-[0_0_8px_#E31E24] animate-laser pointer-events-none"></div>
                                </div>

                                <div className="w-full text-center space-y-1">
                                  <p className="text-[9px] font-bold text-slate-400 tracking-wider">PNR / BOOKING REF</p>
                                  <p className="font-black text-tarco-navy text-sm uppercase tracking-widest">{pnrCode}</p>
                                </div>

                                {/* Barcode representation */}
                                <div className="w-full pt-2">
                                  <Barcode />
                                  <p className="text-[8px] font-mono tracking-[0.25em] text-slate-400 text-center mt-2 uppercase">
                                    TRC-{pnrCode}-0{selectedSuccessPaxIdx + 1}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="bg-slate-50 p-6 flex flex-col gap-3 ticket-actions-container border-t border-slate-100 rounded-b-[25px]">
                              <button className="w-full bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer hover:bg-black/90 active:scale-95 transition-all shadow-md shadow-black/10">
                                <Wallet size={16} />
                                {t.success.wallet}
                              </button>
                              <button
                                onClick={() => window.print()}
                                className="w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-wider hover:bg-slate-100 hover:text-tarco-navy active:scale-95 transition-all cursor-pointer"
                              >
                                <Download size={16} />
                                {lang === 'en' ? 'Download PDF / Print' : 'تحميل بصيغة PDF / طباعة'}
                              </button>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <button
                        onClick={() => window.location.reload()}
                        className="text-tarco-navy font-bold hover:text-tarco-red transition-colors cursor-pointer text-sm book-another-btn"
                      >
                        {t.success.bookAnother}
                      </button>
                    </motion.div>
                  );
                })()}

                {/* Mobile Sticky Bottom Sheet */}
                {['results', 'passengers', 'services', 'seats'].includes(step) && (
                  <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/80 backdrop-blur-lg border-t border-slate-100 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.seats.total}</span>
                      <span className="text-xl font-black text-tarco-navy">{formatPrice(getBookingTotal())}</span>
                    </div>
                    {step === 'results' && (
                      <button
                        disabled={!selectedFare}
                        onClick={nextStep}
                        className={`px-8 py-3 rounded-xl font-bold transition-all text-sm ${
                          selectedFare
                            ? 'bg-tarco-red text-white hover:bg-red-600 active:scale-95 shadow-md shadow-red-900/10'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {t.results.continue}
                      </button>
                    )}
                    {step === 'passengers' && (
                      <button
                        onClick={nextStep}
                        className="px-8 py-3 bg-tarco-red hover:bg-red-600 text-white rounded-xl font-bold active:scale-95 transition-all shadow-md shadow-red-900/10 text-sm"
                      >
                        {t.passengersDetails.continue}
                      </button>
                    )}
                    {step === 'services' && (
                      <button
                        onClick={nextStep}
                        className="px-8 py-3 bg-tarco-red hover:bg-red-600 text-white rounded-xl font-bold active:scale-95 transition-all shadow-md shadow-red-900/10 text-sm"
                      >
                        {t.services.continue}
                      </button>
                    )}
                    {step === 'seats' && (
                      <button
                        disabled={!selectedSeat}
                        onClick={nextStep}
                        className={`px-8 py-3 rounded-xl font-bold transition-all text-sm ${
                          selectedSeat
                            ? 'bg-tarco-red hover:bg-red-600 text-white active:scale-95 shadow-md shadow-red-900/10'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {t.seats.confirm}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>



        {/* Footer */}
        <footer className="mt-24 bg-tarco-blue py-24 px-6 text-white">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <img
                src={assets['logo_footer'] || "/Images/logo_footer.png"}
                alt="Tarco Aviation"
                className="h-12 w-auto brightness-0 invert"
                referrerPolicy="no-referrer"
              />
              <div className="flex gap-12 text-xs font-bold uppercase tracking-widest">
                <a href="#" className="hover:text-tarco-red transition-colors">{lang === 'en' ? 'Privacy' : 'الخصوصية'}</a>
                <a href="#" className="hover:text-tarco-red transition-colors">{lang === 'en' ? 'Terms' : 'الشروط'}</a>
                <a href="#" className="hover:text-tarco-red transition-colors">{lang === 'en' ? 'Contact' : 'اتصل بنا'}</a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pt-16 border-t border-white/10">
              <div className="space-y-4">
                <h4 className="text-tarco-red font-black uppercase tracking-widest text-xs">{lang === 'en' ? 'About Tarco' : 'عن تاركو'}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {t.excellence.desc}
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="text-tarco-red font-black uppercase tracking-widest text-xs">{lang === 'en' ? 'Our Network' : 'شبكة وجهاتنا'}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {lang === 'en' ? 'Connecting major cities including Khartoum, Dubai, Riyadh, Cairo, and Addis Ababa with modern aircraft and exceptional service.' : 'نربط المدن الكبرى بما في ذلك الخرطوم ودبي والرياض والقاهرة وأديس أبابا بطائرات حديثة وخدمة استثنائية.'}
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="text-tarco-red font-black uppercase tracking-widest text-xs">{lang === 'en' ? 'Our Offices' : 'مكاتبنا'}</h4>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                      <MapPin size={10} className="text-tarco-red" />
                      {t.contacts.headOffice}
                    </p>
                    <p className="text-xs text-slate-400">{t.contacts.headAddress}</p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-2">
                      <Mail size={10} />
                      we.care@tarcoaviation.com
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                      <MapPin size={10} className="text-tarco-red" />
                      {t.contacts.madaniOffice}
                    </p>
                    <p className="text-xs text-slate-400">{t.contacts.madaniAddress}</p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-2">
                      <Phone size={10} />
                      0120011082
                    </p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-2">
                      <Mail size={10} />
                      madani.office@tarcoaviation.com
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-tarco-red font-black uppercase tracking-widest text-xs">{lang === 'en' ? 'Newsletter' : 'النشرة البريدية'}</h4>
                <div className="flex gap-2">
                  <input className="bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-sm flex-1 outline-none focus:border-tarco-red" placeholder={lang === 'en' ? 'Email Address' : 'البريد الإلكتروني'} />
                  <button className="bg-tarco-red px-4 py-2 rounded-lg font-bold text-xs">{lang === 'en' ? 'Join' : 'اشترك'}</button>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-16 border-t border-white/10 text-[10px] text-slate-500 font-medium uppercase tracking-widest">
              <p>© 2026 {t.brand.first} {t.brand.second}. All rights reserved.</p>
              <div className="flex items-center gap-6">
                {user?.email === 'YSeddig15@gmail.com' && (
                  <a
                    href="https://console.firebase.google.com/project/gen-lang-client-0834655921/firestore/databases/ai-studio-2c905c97-48ea-4e14-877c-1bd9ef21ebd9/data"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tarco-red hover:underline flex items-center gap-2"
                  >
                    <ShieldCheck size={12} />
                    Manage Assets
                  </a>
                )}
                <p>The Legend of Africa</p>
              </div>
            </div>
          </div>
        </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
