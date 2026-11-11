// Languages. Every screen asks for its words through t('key'), so switching
// language changes the whole app at once. English is the source; any word
// a language does not have yet falls back to English instead of breaking.
// Reports and comments stay in the language they were written in.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { TRANSLATIONS } from './locales';
import { getItem, setItem } from './storage';

export const LANGUAGES = [
  { code: 'en', name: 'English', english: 'English', speech: 'en-GB' },
  { code: 'mt', name: 'Malti', english: 'Maltese', speech: 'mt-MT' },
  { code: 'it', name: 'Italiano', english: 'Italian', speech: 'it-IT' },
  { code: 'es', name: 'Español', english: 'Spanish', speech: 'es-ES' },
  { code: 'fr', name: 'Français', english: 'French', speech: 'fr-FR' },
  { code: 'de', name: 'Deutsch', english: 'German', speech: 'de-DE' },
  { code: 'pt', name: 'Português', english: 'Portuguese', speech: 'pt-PT' },
  { code: 'hi', name: 'हिन्दी', english: 'Hindi', speech: 'hi-IN' },
  { code: 'zh', name: '中文', english: 'Chinese', speech: 'zh-CN' },
  { code: 'ar', name: 'العربية', english: 'Arabic', speech: 'ar-SA' },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];

export const EN = {
  // tabs
  'tab.home': 'Home',
  'tab.issues': 'Issues',
  'tab.map': 'Map',
  'tab.report': 'Report',
  'tab.manage': 'Manage',
  'tab.ranks': 'Ranks',
  'tab.profile': 'Profile',

  // shared
  'common.close': 'Close',
  'common.next': 'Next',
  'common.back': 'Back',
  'common.done': 'Done',
  'common.seeAll': 'See all',
  'common.language': 'Language',
  'common.chooseLanguage': 'Choose your language',
  'common.languageNote': 'Reports and comments stay in the language they were written in.',
  'common.emergency': 'Emergency help',

  // home
  'home.morning': 'Good morning, {name}',
  'home.afternoon': 'Good afternoon, {name}',
  'home.evening': 'Good evening, {name}',
  'home.studentLine': 'Here is what is happening on campus today.',
  'home.adminLine': 'Here is what needs your attention today.',
  'home.weatherAt': 'MCAST Paola now',
  'home.wind': 'Wind {speed} km/h',
  'home.liveWeather': 'Live weather',
  'home.seasonWeather': 'Live weather unavailable, showing the season',
  'home.preview': 'Preview the weather',
  'home.live': 'Live',
  'home.quick': 'Quick actions',
  'home.reportProblem': 'Report a problem',
  'home.manageReports': 'Manage reports',
  'home.allIssues': 'All issues',
  'home.campusMap': 'Campus map',
  'home.ranks': 'Leaderboard',
  'home.tour': 'How to use the app',
  'home.latest': 'Latest reports',
  'home.tourTitle': 'New to Campus Fix?',
  'home.tourBody': 'A one-minute guided tour, with voice.',
  'home.startTour': 'Start the tour',
  'home.yourPoints': 'Your points',
  'home.departments': 'Open reports by department',
  'home.needAction': '{n} reports need action',

  // weather
  'weather.clear': 'Sunny',
  'weather.night': 'Clear night',
  'weather.partly': 'Partly cloudy',
  'weather.cloudy': 'Cloudy',
  'weather.fog': 'Foggy',
  'weather.drizzle': 'Drizzle',
  'weather.rain': 'Rain',
  'weather.storm': 'Thunderstorm',
  'weather.snow': 'Snow',
  'weather.wind': 'Windy',
  'tip.clear': 'Sunglasses on. Find some shade between lectures.',
  'tip.night': 'Quiet campus tonight. Stick to the lit paths.',
  'tip.partly': 'A nice day for walking between blocks.',
  'tip.cloudy': 'Grey skies, but no rain yet.',
  'tip.fog': 'Low visibility. Take care in the car park.',
  'tip.drizzle': 'Light rain. A hood will do.',
  'tip.rain': 'Take an umbrella, and report any leaks you spot.',
  'tip.storm': 'Stay indoors if you can. Report flooding or fallen branches.',
  'tip.snow': 'Snow in Malta! Wrap up warm.',
  'tip.wind': 'Hold on to your notes, it is windy out there.',
  'season.spring': 'Spring',
  'season.summer': 'Summer',
  'season.autumn': 'Autumn',
  'season.winter': 'Winter',

  // filters and departments
  'filter.department': 'Department',
  'filter.building': 'Building',
  'filter.status': 'Status',
  'filter.category': 'Category',
  'filter.allDepartments': 'All departments',
  'filter.allBuildings': 'All buildings',
  'filter.clear': 'Clear filters',
  'filter.deptNote': 'The department is set by the category, so students never assign who fixes it.',
  'dept.IT Services': 'IT Services',
  'dept.Estates & Maintenance': 'Estates & Maintenance',
  'dept.Cleaning Services': 'Cleaning Services',
  'dept.Health & Safety': 'Health & Safety',
  'dept.Student Services': 'Student Services',
  'status.Reported': 'Reported',
  'status.Acknowledged': 'Acknowledged',
  'status.In Progress': 'In progress',
  'status.Resolved': 'Resolved',
  'feed.search': 'Search by problem, building or room',
  'feed.mostUpvoted': 'Most upvoted',
  'feed.newest': 'Newest',
  'feed.mine': 'My reports',
  'admin.title': 'Manage reports',
  'admin.sub': 'Sorted by department, most upvoted first.',
  'admin.allOpen': 'All open',

  // map
  'map.search': 'Search places on campus',
  'map.places': '{n} places',
  'map.youAreHere': 'You are here',
  'map.whereTo': 'Where to?',
  'map.fixPosition': 'Fix position',
  'map.following': 'Following',
  'map.recentre': 'Re-centre',
  'map.directions': 'Directions',
  'map.reportHere': 'Report here',
  'map.endRoute': 'End route',
  'map.arrived': 'You have arrived',
  'map.walkingDirections': 'Walking directions',
  'map.yourLocation': 'Your location',

  // emergency
  'em.title1': 'Emergency?',
  'em.title2': 'Act fast.',
  'em.sub': 'Your response can save a life.',
  'em.call112': 'Call 112',
  'em.call112Sub': 'Emergency services and ambulance',
  'em.yourLocation': 'Your location',
  'em.finding': 'Finding where you are...',
  'em.locOff': 'Location is off. Say your block and room when you call.',
  'em.locNone': 'Location is not available. Say your block and room when you call.',
  'em.share': 'Share my location',
  'em.step1': 'Find a first aider',
  'em.step1d': 'In your building or institute. Ask at the reception or the institute office.',
  'em.step2': 'Call 112',
  'em.step2d': 'Emergency services (ambulance).',
  'em.step3': 'Call the MCAST nurse',
  'em.step4': 'Call security',
  'em.step5': 'Give clear information',
  'em.step5d': 'Your location and what happened. Use Share my location above to send it as a message.',
  'em.spot': 'Spot it. Report it.',
  'em.spotBody': 'Make MCAST safer. Something broken or unsafe that is not an emergency? Report it here.',
  'em.report': 'Report a problem',
  'em.thisCampus': 'This campus',
  'em.emergencyLabel': 'Emergency',

  // tour
  'tour.title': 'How to use Campus Fix',
  'tour.listen': 'Listen',
  'tour.stop': 'Stop voice',
  'tour.step': 'Step {n} of {total}',
  'tour.tryIt': 'Try it',
  'tour.finish': 'Finish',
  'tour.noVoice': 'This phone has no voice for this language yet. You can still read along.',
  'tour.s.welcome.t': 'Welcome to Campus Fix',
  'tour.s.welcome.b': 'Campus Fix helps everyone at MCAST spot problems on campus and get them fixed. This tour takes one minute.',
  'tour.s.home.t': 'Home',
  'tour.s.home.b': 'Home shows the weather on campus, quick actions and the latest reports. The little character dresses for the weather.',
  'tour.s.report.t': 'Report a problem',
  'tour.s.report.b': 'Tap the plus button. Choose a category, the building and room, describe the problem and add a photo if you like. You earn points.',
  'tour.s.issues.t': 'See and upvote reports',
  'tour.s.issues.b': 'Issues lists every report on campus. Filter by department, building or status, and upvote the ones that affect you. One upvote per person.',
  'tour.s.map.t': 'Find your way',
  'tour.s.map.b': 'The map knows which block you are in. Search a place, tap Directions and follow the route as you walk. The globe button shows satellite view.',
  'tour.s.ranks.t': 'Points and badges',
  'tour.s.ranks.b': 'Reports, upvotes and fixes earn points. Climb the levels, collect badges and see the weekly leaderboard.',
  'tour.s.manage.t': 'Manage reports',
  'tour.s.manage.b': 'Manage groups every report by department. Move each one forward: reported, acknowledged, in progress, resolved. Add a photo of the fix when it is done.',
  'tour.s.emergency.t': 'Emergency help',
  'tour.s.emergency.b': 'In an emergency tap SOS. Call 112, the MCAST nurse or security with one tap, and share your location.',
  'tour.s.language.t': 'Your language',
  'tour.s.language.b': 'Change the language at any time from Home or your profile. That is it, you are ready.',
  // sharing the app
  'share.row': 'Share the app',
  'share.title': 'Get Campus Fix on any phone',
  'share.body': 'Scan this code with any phone camera to open Campus Fix. It works on iPhone, Android and any phone with a browser.',
  'share.iphone': 'iPhone: open the link in Safari, tap Share, then Add to Home Screen.',
  'share.android': 'Android: open the link in Chrome, tap the menu, then Install app.',
  'share.other': 'Any other phone: open the link in its browser.',
  'share.send': 'Send the link',
  'share.page': 'Open the QR page',
  'share.offline': 'This link only works on the laptop’s Wi-Fi. On the laptop, run npm run share to get a link that works anywhere.',
} as const;

export type TKey = keyof typeof EN;
type Vars = Record<string, string | number>;

type I18nState = {
  lang: LangCode;
  setLang: (code: LangCode) => void;
  t: (key: TKey | string, vars?: Vars) => string;
  speechLocale: string;
};

function translate(lang: LangCode, key: string, vars?: Vars): string {
  const table = TRANSLATIONS[lang] as Record<string, string> | undefined;
  let text = table?.[key] ?? (EN as Record<string, string>)[key] ?? key.replace(/^dept\.|^status\./, '');
  if (vars) for (const [name, value] of Object.entries(vars)) text = text.split(`{${name}}`).join(String(value));
  return text;
}

const I18nContext = createContext<I18nState>({
  lang: 'en',
  setLang: () => {},
  t: (key, vars) => translate('en', key, vars),
  speechLocale: 'en-GB',
});

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;

const KEY = 'language';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('en');

  useEffect(() => {
    getItem(KEY).then((saved) => {
      if (saved && LANGUAGES.some((l) => l.code === saved)) setLangState(saved as LangCode);
    });
  }, []);

  const setLang = useCallback((code: LangCode) => {
    setLangState(code);
    setItem(KEY, code);
  }, []);

  const value = useMemo<I18nState>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      speechLocale: LANGUAGES.find((l) => l.code === lang)?.speech ?? 'en-GB',
    }),
    [lang, setLang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
