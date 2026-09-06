'use strict';

/**
 * Built-in WhatsApp message templates, written out in every language the app
 * supports. These are seeded into the `templates` table (one row per language)
 * so a mandal can still fine-tune the wording of any of them.
 *
 * Placeholders like {{mandal_name}} stay in English in every language — they
 * are code tokens, not words the reader ever sees.
 */

const BUILTIN_TEMPLATES = [
  {
    key: 'invitation',
    category: { en: 'Invite', gu: 'આમંત્રણ', hi: 'निमंत्रण', mr: 'निमंत्रण' },
    en: {
      name: 'Invitation / Aamantran',
      body:
        '🙏 *Ganpati Bappa Morya!* 🙏\n\n{{mandal_name}} warmly invites you and your family to our Ganesh Mahotsav {{year}}.\n\n📅 {{festival_start}} to {{festival_end}}\n📍 {{address}}\n\nPlease come for darshan and aarti with your family.\n\n_Ganpati Bappa Morya, Mangal Murti Morya!_',
    },
    gu: {
      name: 'આમંત્રણ',
      body:
        '🙏 *ગણપતિ બાપ્પા મોર્યા!* 🙏\n\n{{mandal_name}} આપને તથા આપના પરિવારને ગણેશ મહોત્સવ {{year}} માં પધારવા હાર્દિક આમંત્રણ આપે છે.\n\n📅 {{festival_start}} થી {{festival_end}}\n📍 {{address}}\n\nપરિવાર સહિત દર્શન અને આરતીનો લાભ લેશો.\n\n_ગણપતિ બાપ્પા મોર્યા, મંગલ મૂર્તિ મોર્યા!_',
    },
    hi: {
      name: 'निमंत्रण',
      body:
        '🙏 *गणपति बाप्पा मोरया!* 🙏\n\n{{mandal_name}} आपको एवं आपके परिवार को गणेश महोत्सव {{year}} में सादर आमंत्रित करता है।\n\n📅 {{festival_start}} से {{festival_end}}\n📍 {{address}}\n\nकृपया परिवार सहित दर्शन एवं आरती का लाभ लें।\n\n_गणपति बाप्पा मोरया, मंगल मूर्ति मोरया!_',
    },
    mr: {
      name: 'निमंत्रण',
      body:
        '🙏 *गणपती बाप्पा मोरया!* 🙏\n\n{{mandal_name}} आपणास व आपल्या कुटुंबियांना गणेश महोत्सव {{year}} साठी सप्रेम निमंत्रण देत आहे.\n\n📅 {{festival_start}} ते {{festival_end}}\n📍 {{address}}\n\nकृपया कुटुंबासह दर्शन आणि आरतीचा लाभ घ्यावा.\n\n_गणपती बाप्पा मोरया, मंगल मूर्ती मोरया!_',
    },
  },

  {
    key: 'donation_thanks',
    category: { en: 'Donation', gu: 'ફાળો', hi: 'चंदा', mr: 'वर्गणी' },
    en: {
      name: 'Donation Thank You',
      body:
        '🙏 *Thank you {{donor_name}}!* 🙏\n\nWe have received your contribution of {{currency}}{{amount}} for {{mandal_name}} Ganesh Mahotsav {{year}}.\nReceipt No: {{receipt_no}}\nDate: {{date}}\n\nMay Bappa bless you and your family with health, happiness and prosperity.\n\n_Ganpati Bappa Morya!_',
    },
    gu: {
      name: 'ફાળા બદલ આભાર',
      body:
        '🙏 *આભાર {{donor_name}}!* 🙏\n\n{{mandal_name}} ગણેશ મહોત્સવ {{year}} માટે આપનો {{currency}}{{amount}} નો ફાળો મળ્યો છે.\nપહોંચ નંબર: {{receipt_no}}\nતારીખ: {{date}}\n\nબાપ્પા આપને અને આપના પરિવારને સુખ, શાંતિ અને સમૃદ્ધિ આપે.\n\n_ગણપતિ બાપ્પા મોર્યા!_',
    },
    hi: {
      name: 'चंदे के लिए धन्यवाद',
      body:
        '🙏 *धन्यवाद {{donor_name}}!* 🙏\n\n{{mandal_name}} गणेश महोत्सव {{year}} हेतु आपका {{currency}}{{amount}} का सहयोग प्राप्त हुआ है।\nरसीद नंबर: {{receipt_no}}\nदिनांक: {{date}}\n\nबाप्पा आपको और आपके परिवार को सुख, समृद्धि और आरोग्य प्रदान करें।\n\n_गणपति बाप्पा मोरया!_',
    },
    mr: {
      name: 'वर्गणीबद्दल धन्यवाद',
      body:
        '🙏 *धन्यवाद {{donor_name}}!* 🙏\n\n{{mandal_name}} गणेश महोत्सव {{year}} साठी आपली {{currency}}{{amount}} ची वर्गणी मिळाली आहे.\nपावती क्रमांक: {{receipt_no}}\nदिनांक: {{date}}\n\nबाप्पा आपल्याला व आपल्या कुटुंबाला सुख, समृद्धी आणि आरोग्य देवो.\n\n_गणपती बाप्पा मोरया!_',
    },
  },

  {
    key: 'donation_request',
    category: { en: 'Donation', gu: 'ફાળો', hi: 'चंदा', mr: 'वर्गणी' },
    en: {
      name: 'Donation Request / Vargani',
      body:
        '🙏 *Ganpati Bappa Morya!* 🙏\n\n{{mandal_name}} is celebrating Ganesh Mahotsav {{year}} from {{festival_start}} to {{festival_end}}.\n\nWe humbly request your contribution (vargani) to help us serve the community.\n\n💳 UPI: {{upi_id}}\n📞 Contact: {{president_phone}}\n\nEvery contribution, big or small, is a blessing. Thank you!',
    },
    gu: {
      name: 'ફાળા માટે વિનંતી',
      body:
        '🙏 *ગણપતિ બાપ્પા મોર્યા!* 🙏\n\n{{mandal_name}} દ્વારા ગણેશ મહોત્સવ {{year}} ની ઉજવણી {{festival_start}} થી {{festival_end}} દરમિયાન થશે.\n\nઆ સેવાકાર્યમાં આપનો ફાળો આપવા વિનંતી છે.\n\n💳 UPI: {{upi_id}}\n📞 સંપર્ક: {{president_phone}}\n\nનાનો કે મોટો, દરેક ફાળો આશીર્વાદ સમાન છે. આભાર!',
    },
    hi: {
      name: 'चंदे के लिए निवेदन',
      body:
        '🙏 *गणपति बाप्पा मोरया!* 🙏\n\n{{mandal_name}} द्वारा गणेश महोत्सव {{year}} का आयोजन {{festival_start}} से {{festival_end}} तक किया जा रहा है।\n\nइस सेवा कार्य में आपके सहयोग (चंदा) की विनम्र प्रार्थना है।\n\n💳 UPI: {{upi_id}}\n📞 संपर्क: {{president_phone}}\n\nछोटा हो या बड़ा, हर सहयोग आशीर्वाद है। धन्यवाद!',
    },
    mr: {
      name: 'वर्गणीसाठी विनंती',
      body:
        '🙏 *गणपती बाप्पा मोरया!* 🙏\n\n{{mandal_name}} तर्फे गणेश महोत्सव {{year}} चे आयोजन {{festival_start}} ते {{festival_end}} या काळात होत आहे.\n\nया सेवाकार्यात आपली वर्गणी देण्याची नम्र विनंती.\n\n💳 UPI: {{upi_id}}\n📞 संपर्क: {{president_phone}}\n\nलहान असो वा मोठी, प्रत्येक वर्गणी आशीर्वाद आहे. धन्यवाद!',
    },
  },

  {
    key: 'aarti_reminder',
    category: { en: 'Reminder', gu: 'યાદ', hi: 'सूचना', mr: 'आठवण' },
    en: {
      name: "Today's Aarti Reminder",
      body:
        '🔔 *Aarti Reminder* 🔔\n\n{{mandal_name}}\n\nAarti today at the mandap. Please join us on time with your family.\n\n📍 {{address}}\n\n_Ganpati Bappa Morya!_',
    },
    gu: {
      name: 'આરતીની યાદ',
      body:
        '🔔 *આરતીની યાદ* 🔔\n\n{{mandal_name}}\n\nઆજે મંડપમાં આરતી છે. પરિવાર સહિત સમયસર પધારશો.\n\n📍 {{address}}\n\n_ગણપતિ બાપ્પા મોર્યા!_',
    },
    hi: {
      name: 'आज की आरती की सूचना',
      body:
        '🔔 *आरती की सूचना* 🔔\n\n{{mandal_name}}\n\nआज मंडप में आरती है। कृपया परिवार सहित समय पर पधारें।\n\n📍 {{address}}\n\n_गणपति बाप्पा मोरया!_',
    },
    mr: {
      name: 'आजच्या आरतीची आठवण',
      body:
        '🔔 *आरतीची आठवण* 🔔\n\n{{mandal_name}}\n\nआज मंडपात आरती आहे. कृपया कुटुंबासह वेळेवर उपस्थित रहा.\n\n📍 {{address}}\n\n_गणपती बाप्पा मोरया!_',
    },
  },

  {
    key: 'duty_reminder',
    category: { en: 'Reminder', gu: 'યાદ', hi: 'सूचना', mr: 'आठवण' },
    en: {
      name: 'Duty Reminder for Volunteer',
      body:
        '🙏 Jai Shree Ganesh {{member_name}},\n\nYou have *{{slot}}* duty on {{date}} at {{mandal_name}}.\n\nPlease reach the mandap 15 minutes early.\nThank you for your seva! 🙏',
    },
    gu: {
      name: 'ડ્યુટીની યાદ',
      body:
        '🙏 જય શ્રી ગણેશ {{member_name}},\n\n{{mandal_name}} ખાતે {{date}} ના રોજ આપની *{{slot}}* ડ્યુટી છે.\n\nકૃપા કરીને મંડપ પર ૧૫ મિનિટ વહેલા પહોંચશો.\nઆપની સેવા બદલ આભાર! 🙏',
    },
    hi: {
      name: 'ड्यूटी की याद',
      body:
        '🙏 जय श्री गणेश {{member_name}},\n\n{{mandal_name}} में {{date}} को आपकी *{{slot}}* ड्यूटी है।\n\nकृपया मंडप पर 15 मिनट पहले पहुँचें।\nआपकी सेवा के लिए धन्यवाद! 🙏',
    },
    mr: {
      name: 'ड्युटीची आठवण',
      body:
        '🙏 जय श्री गणेश {{member_name}},\n\n{{mandal_name}} येथे {{date}} रोजी आपली *{{slot}}* ड्युटी आहे.\n\nकृपया मंडपात १५ मिनिटे आधी पोहोचावे.\nआपल्या सेवेबद्दल धन्यवाद! 🙏',
    },
  },

  {
    key: 'visarjan',
    category: { en: 'Invite', gu: 'આમંત્રણ', hi: 'निमंत्रण', mr: 'निमंत्रण' },
    en: {
      name: 'Visarjan Announcement',
      body:
        '🙏 *Ganpati Visarjan* 🙏\n\n{{mandal_name}} Ganesh Visarjan Yatra on {{festival_end}}.\n\nPlease join the procession with your family and give Bappa a grand farewell.\n\n_Ganpati Bappa Morya, Pudhchya Varshi Lavkar Ya!_ 🎉',
    },
    gu: {
      name: 'વિસર્જન જાહેરાત',
      body:
        '🙏 *ગણપતિ વિસર્જન* 🙏\n\n{{mandal_name}} ની ગણેશ વિસર્જન યાત્રા {{festival_end}} ના રોજ છે.\n\nપરિવાર સહિત યાત્રામાં જોડાઈ બાપ્પાને ભાવભીની વિદાય આપશો.\n\n_ગણપતિ બાપ્પા મોર્યા, પુઢચ્યા વર્ષી લવકર યા!_ 🎉',
    },
    hi: {
      name: 'विसर्जन सूचना',
      body:
        '🙏 *गणपति विसर्जन* 🙏\n\n{{mandal_name}} की गणेश विसर्जन यात्रा {{festival_end}} को है।\n\nकृपया परिवार सहित यात्रा में शामिल होकर बाप्पा को भावभीनी विदाई दें।\n\n_गणपति बाप्पा मोरया, पुढच्या वर्षी लवकर या!_ 🎉',
    },
    mr: {
      name: 'विसर्जन सूचना',
      body:
        '🙏 *गणपती विसर्जन* 🙏\n\n{{mandal_name}} ची गणेश विसर्जन मिरवणूक {{festival_end}} रोजी आहे.\n\nकृपया कुटुंबासह मिरवणुकीत सहभागी होऊन बाप्पांना भावपूर्ण निरोप द्या.\n\n_गणपती बाप्पा मोरया, पुढच्या वर्षी लवकर या!_ 🎉',
    },
  },
];

/** The English names the very first release seeded, used to upgrade old databases. */
const LEGACY_NAME_TO_KEY = {
  'Invitation / Aamantran': 'invitation',
  'Donation Thank You': 'donation_thanks',
  'Donation Request / Vargani': 'donation_request',
  "Today's Aarti Reminder": 'aarti_reminder',
  'Duty Reminder for Volunteer': 'duty_reminder',
  'Visarjan Announcement': 'visarjan',
};

module.exports = { BUILTIN_TEMPLATES, LEGACY_NAME_TO_KEY };
