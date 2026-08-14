import styles from "./PhoneFrame.module.css";

// Wraps the phone shell (.sv-outer/.sv-frame come from styles/global.css since
// they also define the responsive edge-to-edge breakpoint for real phones).
export default function PhoneFrame({ children }) {
  return (
    <div className="sv-outer">
      <div className="sv-frame">
        <div className={styles.notch} />
        {children}
      </div>
      <p className="sv-footer-label">
        JOVI Smartphones · Study Vision Prototype
      </p>
    </div>
  );
}
