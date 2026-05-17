/**
 * client/src/pages/CareerDetail.jsx
 * Career role detail page — hero + recommended credentials.
 */

import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react';
import apiClient from '../lib/apiClient';
import styles from './CareerDetail.module.css';

// ── Static career data ────────────────────────────────────────────────────────
const CAREERS = {
  'cloud-engineer': {
    title: 'Cloud Engineer',
    tagline: 'If you like building scalable infrastructure and solving complex systems problems, this role is for you.',
    highlight: 'If you like building scalable infrastructure and solving complex systems problems, this role is for you.',
    description: 'A Cloud Engineer designs, builds and maintains cloud-based infrastructure. They deploy and manage services on platforms like AWS, Azure and Google Cloud, optimising for reliability, security and cost.',
    skills: ['Cloud Architecture', 'AWS / Azure / GCP', 'Infrastructure as Code', 'Networking', 'Security', 'DevOps', 'Kubernetes', 'CI/CD Pipelines'],
    salary: 'ZAR 142,800',
    jobs: '1,240',
    icon: 'cloud',
    grad: 'linear-gradient(145deg, #0f172a, #1e3a5f)',
    credentials: [
      {
        provider: 'Google', providerInitial: 'G',
        name: 'Google Cloud Professional Cloud Architect',
        skills: ['Cloud Architecture', 'GCP Services', 'Networking', 'Security', 'Cost Optimisation'],
        rating: '4.8', reviews: '32,145', level: 'Intermediate', months: '6',
        courses: [
          { title: 'Google Cloud Fundamentals: Core Infrastructure', seq: 'Course 1 of 6', icon: 'cloud' },
          { title: 'Essential Google Cloud Infrastructure: Foundation', seq: 'Course 2 of 6', icon: 'layers' },
          { title: 'Elastic Google Cloud Infrastructure', seq: 'Course 3 of 6', icon: 'zap' },
          { title: 'Architecting with Google Kubernetes Engine', seq: 'Course 4 of 6', icon: 'box' },
        ],
        top: true,
      },
      {
        provider: 'Microsoft', providerInitial: 'M',
        name: 'Microsoft Azure Administrator Professional Certificate',
        skills: ['Azure Services', 'Virtual Machines', 'Storage', 'Networking', 'Identity'],
        rating: '4.7', reviews: '18,490', level: 'Beginner', months: '5',
        courses: [
          { title: 'Azure Fundamentals AZ-900', seq: 'Course 1 of 5', icon: 'cloud' },
          { title: 'Azure Administration Essentials', seq: 'Course 2 of 5', icon: 'settings' },
          { title: 'Deploying and Managing Azure Resources', seq: 'Course 3 of 5', icon: 'upload-cloud' },
          { title: 'Azure Security and Identity', seq: 'Course 4 of 5', icon: 'lock' },
        ],
        top: false,
      },
    ],
  },
  'data-scientist': {
    title: 'Data Scientist',
    tagline: 'If you like turning raw data into insights and building predictive models, this role is for you.',
    highlight: 'If you like turning raw data into insights and building predictive models, this role is for you.',
    description: 'A Data Scientist collects, analyses and interprets large datasets to help organisations make data-driven decisions. They build machine-learning models and communicate findings through visualisations.',
    skills: ['Python', 'Machine Learning', 'Statistics', 'SQL', 'Data Visualisation', 'TensorFlow / PyTorch', 'Feature Engineering', 'A/B Testing'],
    salary: 'ZAR 128,600',
    jobs: '956',
    icon: 'bar-chart-2',
    grad: 'linear-gradient(145deg, #4a0072, #9c27b0)',
    credentials: [
      {
        provider: 'IBM', providerInitial: 'I',
        name: 'IBM Data Science Professional Certificate',
        skills: ['Python', 'SQL', 'Data Analysis', 'Machine Learning', 'Data Visualisation'],
        rating: '4.6', reviews: '49,210', level: 'Beginner', months: '11',
        courses: [
          { title: 'What is Data Science?', seq: 'Course 1 of 10', icon: 'search' },
          { title: 'Tools for Data Science', seq: 'Course 2 of 10', icon: 'tool' },
          { title: 'Data Science Methodology', seq: 'Course 3 of 10', icon: 'git-branch' },
          { title: 'Python for Data Science, AI & Development', seq: 'Course 4 of 10', icon: 'code' },
        ],
        top: true,
      },
      {
        provider: 'Google', providerInitial: 'G',
        name: 'Google Advanced Data Analytics Professional Certificate',
        skills: ['Python', 'Tableau', 'Regression', 'Machine Learning', 'Statistics'],
        rating: '4.8', reviews: '21,345', level: 'Intermediate', months: '6',
        courses: [
          { title: 'Foundations of Data Science', seq: 'Course 1 of 7', icon: 'bar-chart-2' },
          { title: 'Get Started with Python', seq: 'Course 2 of 7', icon: 'code' },
          { title: 'Go Beyond the Numbers: Translate Data', seq: 'Course 3 of 7', icon: 'trending-up' },
          { title: 'The Power of Statistics', seq: 'Course 4 of 7', icon: 'activity' },
        ],
        top: false,
      },
    ],
  },
  'digital-marketer': {
    title: 'Digital Marketing Specialist',
    tagline: 'If you like creating online marketing campaigns, analyzing digital data, and driving customer engagement this role is for you.',
    highlight: 'If you like creating online marketing campaigns, analyzing digital data, and driving customer engagement this role is for you.',
    description: 'A Digital Marketing Specialist creates and manages online campaigns to drive engagement and conversions. They optimize SEO, SEM, and social media strategies using analytics tools like Google Analytics.',
    skills: ['Digital Marketing', 'Search Engine Optimisation', 'Social Media Marketing', 'Google Analytics', 'Content Marketing', 'Email Marketing', 'Search Engine Marketing', 'Data Analysis'],
    salary: 'ZAR 116,352.12',
    jobs: '803',
    icon: 'smartphone',
    grad: 'linear-gradient(145deg, #0f172a, #1e3a5f)',
    credentials: [
      {
        provider: 'Google', providerInitial: 'G',
        name: 'Google Digital Marketing & E-commerce Professional Certificate',
        skills: ['Email Marketing', 'Social Media Strategy', 'E-Commerce', 'Social Media Marketing', 'Google Ads', 'Search Engine Optimisation', 'Data Storytelling', 'Loyalty Program…'],
        rating: '4.8', reviews: '49,379', level: 'Beginner', months: '6',
        courses: [
          { title: 'Foundations of Digital Marketing and E-commerce', seq: 'Course 1 of 8', icon: 'smartphone' },
          { title: 'Attract and Engage Customers with Digital Marketing', seq: 'Course 2 of 8', icon: 'target' },
          { title: 'From Likes to Leads: Interact with Customers Online', seq: 'Course 3 of 8', icon: 'heart' },
          { title: 'Think Outside the Inbox: Email Marketing', seq: 'Course 4 of 8', icon: 'mail' },
        ],
        top: true,
      },
      {
        provider: 'IBM', providerInitial: 'I',
        name: 'IBM Digital Marketing and Growth Hacking with GenAI Professional Certificate',
        skills: ['Growth Hacking', 'GenAI for Marketing', 'SEO', 'Paid Ads', 'Analytics', 'Content Strategy'],
        rating: '4.7', reviews: '12,881', level: 'Intermediate', months: '4',
        courses: [
          { title: 'Digital Marketing Fundamentals with GenAI', seq: 'Course 1 of 5', icon: 'cpu' },
          { title: 'SEO and SEM with AI Tools', seq: 'Course 2 of 5', icon: 'search' },
          { title: 'Social Media and Content Strategy', seq: 'Course 3 of 5', icon: 'share-2' },
          { title: 'Data-Driven Marketing Analytics', seq: 'Course 4 of 5', icon: 'bar-chart-2' },
        ],
        top: false,
      },
    ],
  },
};

const LEVELS = ['Beginner', 'Intermediate'];

export default function CareerDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [level, setLevel] = useState('Beginner');

  const career = CAREERS[slug];
  if (!career) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-muted)' }}>Career path not found.</p>
        <Link to="/"><FeatherIcon icon="arrow-left" size={14} /> Back to Discover</Link>
      </div>
    );
  }

  const visibleCreds = career.credentials.filter(
    (c) => c.level === level || c.top
  );

  const handleEnrol = async (credName) => {
    try {
      // Find a matching course from the hub catalogue or just navigate to courses
      navigate('/courses');
    } catch {
      navigate('/courses');
    }
  };

  return (
    <div className={styles.page}>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/"><FeatherIcon icon="home" size={14} /></Link>
        <FeatherIcon icon="chevron-right" size={14} />
        <Link to="/">Careers</Link>
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <p className={styles.heroTagline}>{career.tagline}</p>
          <h1 className={styles.heroTitle}>{career.title}</h1>
          <p className={styles.heroDesc}>{career.description}</p>
          <p className={styles.heroSkills}>
            <strong>Skills you'll need: </strong>
            {career.skills.join(', ')}
          </p>
        </div>

        <div className={styles.heroImg}>
          <div className={styles.heroCircle} style={{ background: career.grad }}>
            <FeatherIcon icon={career.icon} size={80} color="rgba(255,255,255,0.6)" />
          </div>
          <div className={styles.heroPill}>
            <span className={styles.heroPillBold}>{career.salary}</span>
            <span className={styles.heroPillMuted}>median salary ·</span>
            <span className={styles.heroPillBold}>{career.jobs}</span>
            <span className={styles.heroPillMuted}>jobs available*</span>
          </div>
        </div>
      </div>

      {/* Credentials */}
      <div className={styles.credSection}>
        <h2 className={styles.credTitle}>Recommended credentials</h2>

        <div className={styles.levelTabs}>
          {LEVELS.map((l) => (
            <button
              key={l}
              className={[styles.levelTab, level === l ? styles.levelTabActive : ''].join(' ')}
              onClick={() => setLevel(l)}
            >
              {l}
            </button>
          ))}
        </div>

        {career.credentials
          .filter((c) => c.level === level || c.top)
          .map((cred, i) => (
            <div key={i} className={styles.credCard}>
              <div className={styles.credCardTop}>
                {cred.top && (
                  <div className={styles.topBadge}><FeatherIcon icon="star" size={12} /> Top recommendation</div>
                )}
                <div className={styles.providerRow}>
                  <span className={styles.providerLogo}>{cred.providerInitial}</span>
                </div>
                <div className={styles.credName}>{cred.name}</div>
                <div className={styles.credSkills}>
                  <strong>Skills you'll gain: </strong>
                  {cred.skills.join(', ')}
                </div>
                <div className={styles.credMeta}>
                  <span className={styles.credStar}>★</span>
                  <span className={styles.credRating}>{cred.rating}</span>
                  <span>({parseInt(cred.reviews).toLocaleString()} reviews)</span>
                  <span className={styles.credDot}>·</span>
                  <span>{cred.level}</span>
                  <span className={styles.credDot}>·</span>
                  <span>{cred.months} months · Earn degree credit</span>
                </div>
                <div className={styles.credActions}>
                  <button className={styles.btnEnrol} onClick={() => handleEnrol(cred.name)}>
                    Enroll for free
                  </button>
                  <button className={styles.btnDetails} onClick={() => navigate('/courses')}>
                    View details
                  </button>
                  <span style={{ fontSize: '.78rem', color: 'var(--color-muted)' }}>
                    <FeatherIcon icon="info" size={12} /> Why is this recommended?
                  </span>
                </div>
              </div>

              {/* Horizontal course thumbnails */}
              <div className={styles.courseScroll}>
                {cred.courses.map((course, j) => (
                  <div key={j} className={styles.courseThumbCard}>
                    <div className={styles.courseThumb}><FeatherIcon icon={course.icon} size={24} /></div>
                    <div className={styles.courseThumbSeq}>{course.seq}</div>
                    <div className={styles.courseThumbTitle}>{course.title}</div>
                  </div>
                ))}
                {/* Arrow hint */}
                <div style={{
                  flexShrink: 0, width: 32, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'var(--color-muted)',
                }}>
                  <FeatherIcon icon="chevron-right" size={18} />
                </div>
              </div>
            </div>
          ))}
      </div>

    </div>
  );
}
