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
  Phone
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
type Step = 'search' | 'results' | 'services' | 'seats' | 'success';
type Lang = 'en' | 'ar';

interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
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
    id: 'plus',
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
  { id: 'baggage', name: 'Buy Extra Weight', price: 45, icon: Download, description: 'Pre-purchase additional baggage weight for your journey.' },
  { id: 'meal', name: 'Premium Meal', price: 15, icon: Star, description: 'Select from our gourmet Pearl menu options.' },
  { id: 'lounge', name: 'Tarco Pearl Lounge', price: 35, icon: ShieldCheck, description: 'Enjoy exclusive comfort at our Pearl Lounge before departure.' },
  { id: 'wifi', name: 'In-flight Wi-Fi', price: 10, icon: Plane, description: 'Stay connected throughout your flight.' },
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
      title: 'Where Welcome is Peace',
      suffix: 'and Destinations are',
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
      title: 'ترحبانكم سلام',
      suffix: 'ووجهانكم',
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
      services: 'الخدمات',
      seats: 'المقاعد',
      success: 'تأكيد'
    },
    heroAlt: {
      title: 'حلق فوق',
      gold: 'التوقعات',
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

  return (
    <li 
      className="relative flex items-center gap-3 text-sm text-slate-600 cursor-help"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Check size={16} className="text-emerald-500 flex-shrink-0" />
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
      <stat.icon size={18} className="text-tarco-gold" />
      <span className="text-2xl font-black text-white tabular-nums">{display}{stat.suffix}</span>
      <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">{stat.label}</span>
    </div>
  );
}

// --- Main App ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bookingRef = useRef<HTMLDivElement>(null);
  const [showScrollCTA, setShowScrollCTA] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
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

  // Test Connection & Auth Readiness
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
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


  
  const [step, setStep] = useState<Step>('search');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'booking' | 'manage' | 'checkin'>('booking');
  const [from, setFrom] = useState('Khartoum (KRT)');
  const [to, setTo] = useState('Dubai (DXB)');
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

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
    setFrom(to);
    setTo(from);
  };

  const nextStep = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (step === 'search') setStep('results');
      else if (step === 'results') setStep('services');
      else if (step === 'services') setStep('seats');
      else if (step === 'seats') {
        if (!showUpgradeModal && selectedFare?.id !== 'business') {
          setShowUpgradeModal(true);
        } else {
          setStep('success');
        }
      }
    }, 800);
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

  const steps = [
    { id: 'search', label: t.steps.search, icon: Plane },
    { id: 'results', label: t.steps.results, icon: Star },
    { id: 'services', label: t.steps.services, icon: Download },
    { id: 'seats', label: t.steps.seats, icon: Armchair },
    { id: 'success', label: t.steps.success, icon: Check },
  ];

  const scrollToBooking = useCallback(() => {
    bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return (
    <>
      <div 
        dir={t.dir}
        className={`min-h-screen bg-slate-50 ${t.font} text-slate-900 selection:bg-tarco-red/10 selection:text-tarco-red`}
      >
      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center gap-6"
          >
            <div className="relative w-24 h-24">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-slate-100 border-t-tarco-red rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Plane className="text-tarco-blue animate-pulse" size={32} />
              </div>
            </div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-tarco-blue">{t.steps.search}...</p>
          </motion.div>
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
              className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
            >
              <X size={40} strokeWidth={1} />
            </button>
            <div className="w-full max-w-4xl space-y-12">
              <div className="space-y-4 text-center">
                <h2 className="text-4xl md:text-6xl font-extralight text-white tracking-tight">Search Tarco Aviation</h2>
                <p className="text-white/40 text-lg">Find flights, destinations, and travel information.</p>
              </div>
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-tarco-gold group-focus-within:scale-110 transition-transform" size={32} />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Where would you like to go?"
                  className="w-full bg-white/5 border-b-2 border-white/10 py-8 pl-20 pr-8 text-3xl md:text-5xl font-light text-white outline-none focus:border-tarco-gold transition-colors placeholder:text-white/20"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
                {['Popular Destinations', 'Flight Status', 'Travel Requirements'].map((cat) => (
                  <div key={cat} className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-tarco-gold">{cat}</h3>
                    <div className="flex flex-col gap-2">
                      {[1, 2, 3].map(i => (
                        <button key={i} className="text-left text-white/60 hover:text-white transition-colors text-lg font-light flex items-center gap-2 group">
                          <ArrowRightLeft size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                          {cat === 'Popular Destinations' ? ['Dubai (DXB)', 'Cairo (CAI)', 'Riyadh (RUH)'][i-1] : cat + ' Option ' + i}
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
          backgroundColor: navScrolled ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0)',
          backdropFilter: navScrolled ? 'blur(20px)' : 'blur(0px)',
          paddingTop: navScrolled ? '0.75rem' : '1.25rem',
          paddingBottom: navScrolled ? '0.75rem' : '1.25rem',
          borderBottomColor: navScrolled ? 'rgba(226,232,240,1)' : 'rgba(226,232,240,0)',
        }}
        initial={false}
        className="fixed top-0 left-0 right-0 z-[100] px-6 lg:px-12 flex justify-between items-center transition-all duration-500 border-b"
      >
          {/* Logo Section */}
          <div className="flex items-center gap-16">
            <a href="/" className="relative group">
              <SafeImage 
                src={assets['logo_main'] || "/Images/logo_main.png"} 
                alt="Tarco Aviation" 
                className={`h-10 w-32 md:h-12 md:w-40 transition-all duration-500 ${!navScrolled ? 'brightness-0 invert' : ''}`}
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
                    className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:text-tarco-red ${
                      navScrolled ? 'text-tarco-blue' : 'text-white'
                    }`}
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:scale-105 ${
                navScrolled ? 'text-tarco-blue hover:bg-slate-100' : 'text-white hover:bg-white/10'
              }`}
            >
              <Globe size={18} />
              <span className="text-[10px] font-black tracking-widest uppercase">
                {lang === 'en' ? 'AR' : 'EN'}
              </span>
            </button>

            {/* Search Icon */}
            <button 
              onClick={() => setShowSearch(true)}
              className={`p-2 rounded-full transition-all hover:scale-110 ${
                navScrolled ? 'text-tarco-blue hover:bg-slate-100' : 'text-white hover:bg-white/10'
              }`}
            >
              <Search size={22} />
            </button>

            {/* Auth / Profile */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4 border-l pl-8 border-slate-200">
                  <div className="w-10 h-10 rounded-full bg-tarco-gold/20 flex items-center justify-center text-tarco-gold border-2 border-tarco-gold/20">
                    <User size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${navScrolled ? 'text-tarco-blue' : 'text-white'}`}>Logged In</span>
                    <button 
                      onClick={() => logout()}
                      className="text-[10px] font-bold text-tarco-red hover:underline decoration-2 underline-offset-4 text-left"
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
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl ${
                    navScrolled 
                      ? 'bg-tarco-red text-white shadow-red-900/10' 
                      : 'bg-white text-tarco-blue shadow-black/10'
                  }`}
                >
                  <UserRound size={16} />
                  {t.nav.login}
                </motion.button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setShowMobileMenu(true)}
              className={`lg:hidden p-2 rounded-xl border-2 ${
                navScrolled ? 'border-slate-100 text-tarco-blue' : 'border-white/20 text-white'
              }`}
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
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-tarco-gold">{menu.label}</h3>
                    <div className="flex flex-col gap-6">
                      {menu.items.map((item) => (
                        <button key={item.name} className="flex items-center gap-4 text-left group">
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
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              onClick={scrollToBooking}
              className="fixed bottom-8 right-8 z-[150] bg-tarco-red text-white px-6 py-4 rounded-2xl shadow-2xl shadow-red-200 flex items-center gap-3 font-black uppercase tracking-widest text-xs hover:bg-red-600 active:scale-95 transition-colors"
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
          <div className="max-w-7xl mx-auto px-4 pt-8">
            <div className="flex justify-center">
              <div className="flex items-center gap-4 bg-white px-8 py-4 rounded-2xl shadow-sm border border-slate-100">
                {steps.map((s, i) => {
                  const isActive = s.id === step;
                  const isPast = steps.findIndex(x => x.id === step) > i;
                  return (
                    <React.Fragment key={s.id}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-tarco-red text-white shadow-lg shadow-red-200 scale-110' : isPast ? 'bg-tarco-blue text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {isPast ? <Check size={14} /> : <s.icon size={14} />}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-tarco-blue' : 'text-slate-400'}`}>{s.label}</span>
                      </div>
                      {i < steps.length - 1 && <div className={`w-8 h-[2px] rounded-full transition-colors duration-500 ${isPast ? 'bg-tarco-blue' : 'bg-slate-100'}`} />}
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
              <div className="relative h-[85vh] min-h-[600px] w-full overflow-hidden">
                <div className="absolute inset-0 bg-slate-900 overflow-hidden">
                  <canvas ref={canvasRef} id="canvas3d" className="w-full h-full outline-none border-none"></canvas>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/40 pointer-events-none z-10" />
                </div>

                <div className="absolute inset-0 flex flex-col justify-center px-4 md:px-12 lg:px-24 z-20 pointer-events-none">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="max-w-3xl space-y-8"
                  >
                    <div className="space-y-6">
                      <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.2] text-tarco-blue">
                        {t.hero.title}<br />
                        <span className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-2">
                          {t.hero.suffix}
                          {t.hero.highlight && (
                            <span className="bg-tarco-red text-white px-6 py-2 inline-flex items-center justify-center shadow-2xl shadow-red-900/20 rounded-xs">
                              {t.hero.highlight}
                            </span>
                          )}
                        </span>
                      </h1>
                      <p className="text-lg md:text-xl text-slate-700 font-medium tracking-wide max-w-xl opacity-90">
                        {t.hero.subtitle}
                      </p>
                    </div>
                    
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.2 }}
                      className="flex items-center gap-6 pointer-events-auto"
                    >
                      <button 
                        onClick={scrollToBooking}
                        className="px-10 py-4 rounded-full border-2 border-white text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-slate-900 transition-all duration-300"
                      >
                        {t.hero.cta}
                      </button>
                    </motion.div>
                  </motion.div>
                </div>
              </div>

              {/* Sticky Booking Card */}
              <div ref={bookingRef} className="relative z-30 -mt-24 max-w-7xl mx-auto px-4">
                <div className="bg-white rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden">

                    {/* Main Tabs - styled like Qatar Airways / Modern Tabs */}
                    <div className="flex bg-slate-100 relative">
                      {[{id:'booking', icon: Plane, label: t.nav.book}, {id:'manage', icon: ShieldCheck, label: t.booking.manage}, {id:'checkin', icon: Check, label: t.booking.checkin}].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex-1 py-5 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all relative ${
                            activeTab === tab.id 
                              ? 'bg-white text-tarco-red' 
                              : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                          }`}
                        >
                          <tab.icon size={16} className={activeTab === tab.id ? 'text-tarco-red' : 'text-slate-400'} />
                          {tab.label}
                          {activeTab === tab.id && <div className="absolute top-0 left-0 right-0 h-1 bg-tarco-red" />}
                        </button>
                      ))}
                    </div>

                    <div className="p-6 md:p-8">
                      {activeTab === 'booking' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                          {/* â”€â”€ Row 1: Trip-type radios â”€â”€ */}
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

                          {/* â”€â”€ Row 2: Unified seamless input bar â”€â”€ */}
                          <div className="flex flex-col md:flex-row items-stretch rounded-2xl border border-slate-200 bg-slate-50 overflow-visible mb-4 shadow-sm">

                            {/* From */}
                            <div className="flex-1 relative group">
                              <div className="flex items-center gap-3 px-4 py-3 h-full">
                                <MapPin size={18} className="text-tarco-blue flex-shrink-0" />
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">{t.booking.from}</span>
                                  <input
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    className="bg-transparent font-semibold text-sm text-slate-800 w-full outline-none placeholder:text-slate-400 leading-tight"
                                  />
                                </div>
                              </div>

                              {/* Swap button sits between From and To */}
                              <motion.button
                                whileHover={{ rotate: 180, scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                                onClick={handleSwap}
                                className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-20 bg-white border border-slate-200 shadow-md p-1.5 rounded-full text-tarco-blue hidden md:flex items-center justify-center hover:bg-tarco-blue hover:text-white transition-colors"
                              >
                                <ArrowRightLeft size={14} />
                              </motion.button>

                              {/* Mobile swap button */}
                              <button
                                onClick={handleSwap}
                                className="md:hidden w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-tarco-blue border-t border-b border-slate-200"
                              >
                                <ArrowRightLeft size={14} /> {lang === 'en' ? 'Swap' : 'تبديل'}
                              </button>

                              <div className="hidden md:block absolute right-0 top-3 bottom-3 w-[1px] bg-slate-200" />
                            </div>

                            {/* To */}
                            <div className="flex-1 relative group">
                              <div className="flex items-center gap-3 px-4 py-3 h-full">
                                <MapPin size={18} className="text-tarco-red flex-shrink-0" />
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">{t.booking.to}</span>
                                  <input
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    className="bg-transparent font-semibold text-sm text-slate-800 w-full outline-none placeholder:text-slate-400 leading-tight"
                                  />
                                </div>
                              </div>
                              <div className="hidden md:block absolute right-0 top-3 bottom-3 w-[1px] bg-slate-200" />
                            </div>

                            {/* Date Picker trigger (seamless) â€” calendar renders below as inline block */}
                            <div className={`flex-[1.3] relative group ${showCalendar ? 'bg-blue-50/40 rounded-lg' : ''}`}>
                              <HeroDatePicker
                                departureDate={departureDate}
                                returnDate={returnDate}
                                isRoundTrip={isRoundTrip}
                                isOpen={showCalendar}
                                seamless={true}
                                onToggle={() => setShowCalendar(!showCalendar)}
                                t={t}
                              />
                              <div className="hidden md:block absolute right-0 top-3 bottom-3 w-[1px] bg-slate-200" />
                            </div>

                            {/* Passengers */}
                            <div className="relative flex-1">
                              <div
                                onClick={() => setShowPaxDropdown(!showPaxDropdown)}
                                className="flex items-center gap-3 px-4 py-3 h-full cursor-pointer"
                              >
                                <Users size={18} className="text-tarco-blue flex-shrink-0" />
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">{lang === 'en' ? 'Passengers / Class' : 'المسافرون / الدرجة'}</span>
                                  <span className="font-semibold text-sm text-slate-800 whitespace-nowrap">
                                    {passengers.adults + passengers.children + passengers.infants}{' '}
                                    {lang === 'en' ? (passengers.adults + passengers.children + passengers.infants !== 1 ? 'Passengers' : 'Passenger') : 'مسافر'} {lang === 'en' ? 'Economy' : 'السياحية'}
                                  </span>
                                </div>
                                <ChevronDown size={14} className="text-slate-400 ml-auto" />
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
                                              <p.icon size={16} />
                                            </div>
                                            <div>
                                              <p className="text-xs font-bold text-tarco-blue">{p.label}</p>
                                              <p className="text-[10px] text-slate-400">{lang === 'en' ? p.sub : (p.id === 'adults' ? '12+ سنة' : p.id === 'children' ? '2-11 سنة' : 'تحت سنتين')}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <button
                                              onClick={() => updatePax(p.id as keyof PassengerCount, -1)}
                                              className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 font-bold"
                                            >âˆ’</button>
                                            <span className="text-sm font-bold w-4 text-center">{passengers[p.id as keyof PassengerCount]}</span>
                                            <button
                                              onClick={() => updatePax(p.id as keyof PassengerCount, 1)}
                                              className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 font-bold"
                                            >+</button>
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

                          {/* â”€â”€ Inline Calendar (expands booking card) â”€â”€ */}
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
                            />
                          )}

                          {/* â”€â”€ Row 3: Bottom bar â€“ Promo + Search â”€â”€ */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* Promo code â€“ subtle text link style */}
                            <div className="flex items-center gap-2 group">
                              <Star size={15} className="text-tarco-gold" />
                              <input
                                placeholder={`+ ${t.booking.promo || 'Add promo code'}`}
                                className="bg-transparent text-sm font-semibold text-tarco-blue placeholder:text-slate-400 outline-none w-44 border-b border-dashed border-slate-300 focus:border-tarco-blue pb-0.5 transition-colors"
                              />
                            </div>

                            {/* Search flights button */}
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={nextStep}
                              className="bg-tarco-red hover:bg-red-700 text-white px-10 py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-red-100 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
                            >
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



                {/* Destination Exploration Carousel */}
                <div className="py-24 space-y-12 overflow-hidden">
                  <div className="text-center space-y-4">
                    <h2 className="text-4xl font-black text-tarco-blue uppercase tracking-tight">{t.destinations.title}</h2>
                    <div className="w-24 h-1 bg-tarco-red mx-auto"></div>
                  </div>
                  
                  <div className="flex gap-6 overflow-x-auto pb-12 px-4 no-scrollbar snap-x snap-mandatory">
                    {[
                      { id: 'riyadh', img: assets['dest_riyadh'] || '/Images/dest_riyadh.jpg', name: t.destinations.riyadh, price: 420, tag: t.destTags.booked },
                      { id: 'cairo', img: assets['dest_cairo'] || '/Images/dest_cairo.jpg', name: t.destinations.cairo, price: 290, tag: t.destTags.value },
                      { id: 'khartoum', img: assets['dest_khartoum'] || '/Images/dest_khartoum.jpg', name: lang === 'en' ? 'KHARTOUM' : 'الخرطوم', price: 250, tag: t.destTags.core },
                      { id: 'portsudan', img: assets['dest_portsudan'] || '/Images/dest_portsudan.jpg', name: lang === 'en' ? 'PORT SUDAN' : 'بورتسودان', price: 220, tag: t.destTags.active },
                      { id: 'jeddah', img: assets['dest_jeddah'] || '/Images/dest_jeddah.jpg', name: lang === 'en' ? 'JEDDAH' : 'جدة', price: 340, tag: t.destTags.popular },
                    ].map((dest) => (
                      <motion.div 
                        key={dest.id}
                        whileHover={{ scale: 1.02 }}
                        className="relative min-w-[85vw] md:min-w-[600px] h-[400px] rounded-[40px] overflow-hidden snap-center shadow-2xl group cursor-pointer"
                      >
                        <SafeImage 
                          src={dest.img} 
                          alt={dest.name} 
                          className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-110"
                          fallbackSrc={dest.img}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                        
                        {/* Tag badge */}
                        <div className="absolute top-6 left-6 bg-tarco-gold/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                          {dest.tag}
                        </div>

                        {/* UI Overlay Card */}
                        <div className="absolute bottom-8 left-8 right-8 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl flex justify-between items-center group-hover:bg-white/20 transition-all">
                          <div>
                            <h3 className="text-3xl font-black text-white uppercase">{dest.name}</h3>
                            <p className="text-tarco-gold font-bold">{t.destinations.starting} <span className="text-2xl">${dest.price}</span></p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-tarco-red text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-900/40"
                          >
                            {t.destinations.bookNow}
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
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

                {/* Service Excellence Section */}
                <div className="py-24 bg-white rounded-[60px] shadow-sm border border-slate-100 overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-2 items-center">
                    <div className="p-12 lg:p-24 space-y-8">
                      <div className="space-y-4">
                        <h2 className="text-5xl font-black text-tarco-blue leading-tight">{t.excellence.title}</h2>
                        <p className="text-xl text-tarco-red font-bold">{t.excellence.subtitle}</p>
                      </div>
                      
                      <div className="space-y-6">
                        {[t.excellence.point1, t.excellence.point2, t.excellence.point3].map((point, i) => (
                          <div key={i} className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-tarco-red/10 rounded-full flex items-center justify-center text-tarco-red">
                              <Check size={20} />
                            </div>
                            <span className="text-lg font-bold text-slate-700">{point}</span>
                          </div>
                        ))}
                      </div>

                      <p className="text-slate-500 italic border-l-4 border-tarco-red pl-6 py-2">
                        "{t.excellence.desc}"
                      </p>
                      
                      <button className="bg-tarco-blue text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-tarco-navy transition-all shadow-xl shadow-blue-100">
                        {t.journey.learn}
                      </button>
                    </div>
                    
                    <div className="h-[600px] relative">
                      <SafeImage 
                        src={assets['crew_photo'] || "/Images/crew_photo.jpg"} 
                        alt="Cabin Crew" 
                        className="absolute inset-0 w-full h-full"
                        fallbackSrc="/Images/crew_photo.jpg"
                      />
                      <div className="absolute inset-0 bg-gradient-to-l from-white/20 to-transparent hidden lg:block"></div>
                    </div>
                  </div>
                </div>

                {/* Popular Destinations Grid */}
                <div className="py-24 space-y-12">
                  <div className="flex justify-between items-end">
                    <div className="space-y-4">
                      <h2 className="text-4xl font-black text-tarco-blue uppercase tracking-tight">{t.destinations.title}</h2>
                      <div className="w-24 h-1 bg-tarco-red"></div>
                    </div>
                    <button className="text-tarco-red font-black uppercase tracking-widest text-xs hover:underline">
                      {lang === 'en' ? 'View All Destinations' : 'عرض كل الوجهات'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { id: 'dubai', img: assets['dest_dubai'] || '/Images/dest_dubai.jpg', name: 'DUBAI', price: 380, flights: 8 },
                      { id: 'doha', img: assets['dest_doha'] || '/Images/dest_doha.jpg', name: 'DOHA', price: 410, flights: 3 },
                      { id: 'muscat', img: assets['dest_muscat'] || '/Images/dest_muscat.jpg', name: 'MUSCAT', price: 390, flights: 2 },
                      { id: 'entebbe', img: assets['dest_entebbe'] || '/Images/dest_entebbe.jpg', name: 'ENTEBBE', price: 450, flights: 2 },
                    ].map((dest) => (
                      <motion.div 
                        key={dest.id}
                        whileHover={{ scale: 1.02 }}
                        className="relative h-[300px] rounded-[40px] overflow-hidden shadow-xl group cursor-pointer"
                      >
                        <SafeImage 
                          src={dest.img} 
                          alt={dest.name} 
                          className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-110"
                          fallbackSrc={dest.img}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-all"></div>

                        {/* Hover-reveal info */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                          <h3 className="text-4xl font-black text-white tracking-[0.2em] group-hover:-translate-y-4 transition-all duration-300">{dest.name}</h3>
                          <div className="opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex flex-col items-center gap-2">
                            <p className="text-tarco-gold font-bold text-lg">From ${dest.price}</p>
                            <div className="flex items-center gap-2 text-white/70 text-xs">
                              <Clock size={12} />
                              <span>{dest.flights} flights daily</span>
                            </div>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              className="mt-1 bg-tarco-red text-white px-6 py-2 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg"
                            >
                              {t.destinations.bookNow}
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
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
              className="max-w-7xl mx-auto px-4 py-12"
            >
              {step === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-tarco-navy">{t.results.title}</h2>
                  <p className="text-slate-500">Flight TRC-402 â€¢ {from} to {to}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-400 uppercase">{t.results.departing}</span>
                  <p className="font-bold">08:45 AM â€¢ 14 Apr</p>
                </div>
              </div>

              {/* Price Calendar Strip (Saudia Style) */}
              <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 flex overflow-x-auto no-scrollbar">
                {[
                  { date: '11 Apr', price: 280 },
                  { date: '12 Apr', price: 265 },
                  { date: '13 Apr', price: 250 },
                  { date: '14 Apr', price: 240, active: true },
                  { date: '15 Apr', price: 240 },
                  { date: '16 Apr', price: 290 },
                  { date: '17 Apr', price: 310 },
                ].map((d, i) => (
                  <div 
                    key={i}
                    className={`flex-1 min-w-[100px] py-4 px-2 rounded-xl text-center cursor-pointer transition-all ${d.active ? 'bg-tarco-blue text-white shadow-lg' : 'hover:bg-slate-50'}`}
                  >
                    <p className={`text-[10px] font-black uppercase tracking-widest ${d.active ? 'text-white/60' : 'text-slate-400'}`}>{d.date}</p>
                    <p className="text-sm font-black mt-1">${d.price}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {FARES.map((fare) => (
                  <motion.div
                    key={fare.id}
                    whileHover={{ y: -5 }}
                    onClick={() => setSelectedFare(fare)}
                    className={`relative cursor-pointer rounded-3xl p-8 border-2 transition-all ${
                      selectedFare?.id === fare.id 
                        ? 'border-tarco-navy bg-white shadow-2xl' 
                        : fare.recommended 
                          ? 'border-tarco-gold bg-white shadow-xl' 
                          : 'border-slate-100 bg-white hover:border-slate-200'
                    } ${fare.recommended ? 'md:scale-105 z-10' : ''}`}
                  >
                    {fare.recommended && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-tarco-red text-white text-[10px] font-black uppercase tracking-tighter px-4 py-1 rounded-full shadow-md">
                        {t.results.popular}
                      </div>
                    )}
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-tarco-blue">
                            {fare.id === 'lite' ? t.fares.lite : fare.id === 'semi' ? t.fares.semi : t.fares.business}
                          </h3>
                          <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-sm font-bold text-slate-400">$</span>
                            <span className="text-4xl font-black">{fare.price}</span>
                          </div>
                        </div>
                      </div>
                      
                      <ul className="space-y-3">
                        {fare.features.map((feature, i) => (
                          <FeatureItem key={i} feature={feature} lang={lang} />
                        ))}
                      </ul>

                      <button 
                        className={`w-full py-4 rounded-2xl font-bold transition-all ${
                          selectedFare?.id === fare.id 
                            ? 'bg-tarco-navy text-white' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {selectedFare?.id === fare.id ? t.results.selected : t.results.select}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-slate-200">
                <button onClick={() => setStep('search')} className="text-slate-400 font-bold hover:text-tarco-navy transition-colors">{t.results.back}</button>
                <button 
                  disabled={!selectedFare}
                  onClick={nextStep}
                  className={`px-12 py-4 rounded-2xl font-bold shadow-lg transition-all ${
                    selectedFare 
                      ? 'bg-tarco-red text-white hover:bg-red-600 active:scale-95' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {t.results.continue}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'services' && (
            <motion.div
              key="services"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-tarco-navy">{t.services.title}</h2>
                <p className="text-slate-500">{t.services.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {EXTRA_SERVICES.map((service) => (
                  <motion.div
                    key={service.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => toggleService(service.id)}
                    className={`p-6 rounded-3xl border-2 cursor-pointer transition-all flex items-center gap-6 ${
                      selectedServices.includes(service.id) 
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
                      <p className="text-lg font-black text-tarco-blue">${service.price}</p>
                      <div className={`w-6 h-6 rounded-full border-2 mt-2 flex items-center justify-center transition-all ${selectedServices.includes(service.id) ? 'bg-tarco-red border-tarco-red' : 'border-slate-200'}`}>
                        {selectedServices.includes(service.id) && <Check size={14} className="text-white" />}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-slate-200">
                <button onClick={() => setStep('results')} className="text-slate-400 font-bold hover:text-tarco-navy transition-colors">{t.services.back}</button>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">{t.services.total}</p>
                    <p className="text-xl font-black text-tarco-blue">
                      ${selectedServices.reduce((acc, id) => acc + (EXTRA_SERVICES.find(s => s.id === id)?.price || 0), 0)}
                    </p>
                  </div>
                  <button 
                    onClick={nextStep}
                    className="px-12 py-4 bg-tarco-red text-white rounded-2xl font-bold shadow-lg hover:bg-red-600 active:scale-95 transition-all"
                  >
                    {t.services.continue}
                  </button>
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
              className="grid grid-cols-1 lg:grid-cols-12 gap-12"
            >
              <div className="lg:col-span-8 space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-tarco-navy">{t.seats.title}</h2>
                  <p className="text-slate-500">{t.seats.subtitle}</p>
                </div>

                {/* Seat Map */}
                <div className="bg-white rounded-[40px] p-12 shadow-xl border border-slate-100 relative overflow-hidden">
                  {/* Airplane Shape Decoration */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-full bg-slate-50/50 rounded-t-[200px] border-x border-slate-100 pointer-events-none">
                    {/* Cockpit Area */}
                    <div className="absolute top-0 left-0 right-0 h-48 bg-slate-100/50 rounded-t-[200px] border-b border-slate-200 flex flex-col items-center justify-center gap-2">
                      <div className="flex gap-8">
                        <div className="w-16 h-8 bg-slate-200 rounded-tl-full" />
                        <div className="w-16 h-8 bg-slate-200 rounded-tr-full" />
                      </div>
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">{t.seats.deck}</span>
                    </div>
                  </div>
                  
                  <div className="relative z-10 space-y-4 max-w-md mx-auto pt-48">
                    {/* Column Labels */}
                    <div className="grid grid-cols-6 gap-3 mb-8 text-center text-[10px] font-black text-slate-300">
                      <span>A</span><span>B</span><span>C</span><span className="opacity-0">|</span><span>D</span><span>E</span><span>F</span>
                    </div>

                    {SEATS.map((row, rowIndex) => (
                      <div key={rowIndex} className="grid grid-cols-6 gap-3 items-center">
                        {row.map((seat, colIndex) => (
                          <React.Fragment key={seat.id}>
                            {colIndex === 3 && <div className="w-4 h-full flex items-center justify-center text-[10px] font-bold text-slate-200">{rowIndex + 1}</div>}
                            <motion.button
                              whileHover={seat.type !== 'occupied' ? { scale: 1.1 } : {}}
                              whileTap={seat.type !== 'occupied' ? { scale: 0.95 } : {}}
                              disabled={seat.type === 'occupied'}
                              onClick={() => setSelectedSeat(seat)}
                              className={`relative aspect-square rounded-lg flex items-center justify-center transition-all ${
                                seat.type === 'occupied' 
                                  ? 'bg-slate-200 cursor-not-allowed' 
                                  : selectedSeat?.id === seat.id
                                    ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                                    : seat.price > 0
                                      ? 'bg-tarco-navy text-white'
                                      : 'bg-blue-100 text-tarco-navy hover:bg-blue-200'
                              }`}
                            >
                              <Armchair size={16} />
                              {selectedSeat?.id === seat.id && seat.price > 0 && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20"
                                >
                                  Legroom: +${seat.price}
                                </motion.div>
                              )}
                            </motion.button>
                          </React.Fragment>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 space-y-6 sticky top-24">
                  <h3 className="text-xl font-bold text-tarco-navy">{t.seats.summary}</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{t.seats.fare} ({selectedFare?.id === 'lite' ? t.fares.lite : selectedFare?.id === 'semi' ? t.fares.semi : t.fares.business})</span>
                      <span className="font-bold">${selectedFare?.price}</span>
                    </div>
                    {selectedServices.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-300 uppercase">{t.seats.extra}</p>
                        {selectedServices.map(id => {
                          const s = EXTRA_SERVICES.find(x => x.id === id);
                          return (
                            <div key={id} className="flex justify-between text-sm">
                              <span className="text-slate-500">{t.serviceItems[id as keyof typeof t.serviceItems].name}</span>
                              <span className="font-bold">${s?.price}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {selectedSeat && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t.seats.seat} {selectedSeat.label}</span>
                        <span className="font-bold">${selectedSeat.price}</span>
                      </div>
                    )}
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                      <span className="font-bold text-tarco-navy">{t.seats.total}</span>
                      <span className="text-3xl font-black text-tarco-navy">
                        ${(selectedFare?.price || 0) + 
                          (selectedSeat?.price || 0) + 
                          selectedServices.reduce((acc, id) => acc + (EXTRA_SERVICES.find(s => s.id === id)?.price || 0), 0)
                        }
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <ShieldCheck size={16} className="text-emerald-500" />
                      {t.seats.secure}
                    </div>
                  </div>

                  <button 
                    onClick={nextStep}
                    disabled={!selectedSeat}
                    className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all ${
                      selectedSeat 
                        ? 'bg-tarco-navy text-white hover:bg-slate-800 active:scale-95' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {t.seats.confirm}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 space-y-12"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check size={40} />
                </div>
                <h2 className="text-4xl font-black text-tarco-navy">{t.success.title}</h2>
                <p className="text-slate-500">{t.success.subtitle} {to} {t.success.begins}</p>
              </div>

              {/* Digital Boarding Pass */}
              <motion.div 
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl border border-slate-100"
              >
                <div className="bg-tarco-blue p-8 text-white space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col leading-none">
                      <div className="flex items-center gap-0.5">
                        <span className="font-black tracking-tighter text-tarco-red">TARCO</span>
                        <span className="font-black tracking-tighter text-white">AVIATION</span>
                      </div>
                      <span className="text-[6px] font-bold text-tarco-red uppercase tracking-widest mt-0.5">The Legend of Africa</span>
                    </div>
                    <span className="text-xs font-bold opacity-60 uppercase tracking-widest">{t.success.boardingPass}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-3xl font-black">KRT</h4>
                      <p className="text-[10px] font-bold opacity-60 uppercase">Khartoum</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-[1px] bg-white/20"></div>
                      <Plane size={14} className="text-tarco-gold" />
                      <div className="w-12 h-[1px] bg-white/20"></div>
                    </div>
                    <div className="text-right">
                      <h4 className="text-3xl font-black">DXB</h4>
                      <p className="text-[10px] font-bold opacity-60 uppercase">Dubai</p>
                    </div>
                  </div>
                </div>

                <div className="p-8 space-y-8 relative">
                  {/* Perforated Line */}
                  <div className="absolute top-0 left-0 right-0 flex justify-between px-4 -translate-y-1/2">
                    <div className="w-6 h-6 bg-slate-50 rounded-full -ml-7"></div>
                    <div className="border-t-2 border-dashed border-slate-100 flex-grow mt-3"></div>
                    <div className="w-6 h-6 bg-slate-50 rounded-full -mr-7"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t.success.passenger}</p>
                      <p className="font-bold text-tarco-navy">Y. Seddig</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t.success.flight}</p>
                      <p className="font-bold text-tarco-navy">TRC 402</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t.booking.date}</p>
                      <p className="font-bold text-tarco-navy">14 APR 26</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{lang === 'en' ? 'Gate' : 'البوابة'}</p>
                      <p className="font-bold text-tarco-navy">B12</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t.seats.seat}</p>
                      <p className="font-bold text-tarco-navy">{selectedSeat?.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{lang === 'en' ? 'Class' : 'الدرجة'}</p>
                      <p className="font-bold text-tarco-navy">{selectedFare?.id === 'lite' ? t.fares.lite : selectedFare?.id === 'semi' ? t.fares.semi : t.fares.business}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center pt-4 space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <QrCode size={120} className="text-tarco-navy" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-300 tracking-[0.3em]">TRC-99283-XJ-01</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 flex flex-col gap-3">
                  <button className="w-full bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
                    <Wallet size={18} />
                    {t.success.wallet}
                  </button>
                  <button className="w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm hover:bg-slate-50 transition-colors">
                    <Download size={18} />
                    {lang === 'en' ? 'Download PDF' : 'تحميل بصيغة PDF'}
                  </button>
                </div>
              </motion.div>

              <button 
                onClick={() => window.location.reload()}
                className="text-tarco-navy font-bold hover:underline"
              >
                {t.success.bookAnother}
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
    </div>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpgradeModal(false)}
              className="absolute inset-0 bg-tarco-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[32px] overflow-hidden max-w-2xl w-full shadow-2xl"
            >
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-6 right-6 z-20 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-md transition-all"
              >
                <X size={20} />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="h-64 md:h-auto relative">
                  <img 
                    src={assets['upgrade_bg'] || "https://picsum.photos/seed/luxury-cabin/800/1200"} 
                    alt="Business Class" 
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-tarco-navy/80 to-transparent md:bg-gradient-to-r"></div>
                </div>
                <div className="p-10 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-tarco-gold">
                      <Star size={16} fill="currentColor" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.upgrade.subtitle}</span>
                    </div>
                    <h3 className="text-3xl font-black text-tarco-navy leading-tight">{t.upgrade.title}</h3>
                  </div>
                  
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {t.upgrade.desc}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-tarco-navy">
                        <Wifi size={14} />
                      </div>
                      Free High-Speed Wi-Fi
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-tarco-navy">
                        <Coffee size={14} />
                      </div>
                      Premium Dining Experience
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        setSelectedFare(FARES[2]);
                        setShowUpgradeModal(false);
                        setStep('success');
                      }}
                      className="w-full bg-tarco-red text-white py-4 rounded-2xl font-black shadow-lg hover:bg-red-600 transition-all active:scale-95"
                    >
                      {t.upgrade.button}
                    </button>
                    <button 
                      onClick={() => {
                        setShowUpgradeModal(false);
                        setStep('success');
                      }}
                      className="w-full py-2 text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors"
                    >
                      {t.upgrade.no}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <a href="#" className="hover:text-tarco-gold transition-colors">{lang === 'en' ? 'Privacy' : 'الخصوصية'}</a>
              <a href="#" className="hover:text-tarco-gold transition-colors">{lang === 'en' ? 'Terms' : 'الشروط'}</a>
              <a href="#" className="hover:text-tarco-gold transition-colors">{lang === 'en' ? 'Contact' : 'اتصل بنا'}</a>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pt-16 border-t border-white/10">
            <div className="space-y-4">
              <h4 className="text-tarco-gold font-black uppercase tracking-widest text-xs">{lang === 'en' ? 'About Tarco' : 'عن تاركو'}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t.excellence.desc}
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-tarco-gold font-black uppercase tracking-widest text-xs">{lang === 'en' ? 'Our Network' : 'شبكة وجهاتنا'}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                {lang === 'en' ? 'Connecting major cities including Khartoum, Dubai, Riyadh, Cairo, and Addis Ababa with modern aircraft and exceptional service.' : 'نربط المدن الكبرى بما في ذلك الخرطوم ودبي والرياض والقاهرة وأديس أبابا بطائرات حديثة وخدمة استثنائية.'}
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-tarco-gold font-black uppercase tracking-widest text-xs">{lang === 'en' ? 'Our Offices' : 'مكاتبنا'}</h4>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <MapPin size={10} className="text-tarco-gold" />
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
                    <MapPin size={10} className="text-tarco-gold" />
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
              <h4 className="text-tarco-gold font-black uppercase tracking-widest text-xs">{lang === 'en' ? 'Newsletter' : 'النشرة البريدية'}</h4>
              <div className="flex gap-2">
                <input className="bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-sm flex-1 outline-none focus:border-tarco-gold" placeholder={lang === 'en' ? 'Email Address' : 'البريد الإلكتروني'} />
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
                  className="text-tarco-gold hover:underline flex items-center gap-2"
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
      </div>
    </>
  );
}
