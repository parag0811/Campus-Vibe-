import Image from "next/image";
import LoginPanel from "@/components/login-register/login-panel";
import styles from "./login.module.css";
import loginbg from "@/assets/loginbg.png";
import Link from "next/link";

export default function Login() {
  return (
    <div className={styles.container}>
      {/* Left side - Login Form */}
      <div className={styles.leftPanel}>
        <LoginPanel />
      </div>

      {/* Right side - Background Image */}
      <div className={styles.rightPanel}>
        <Image
          src={loginbg}
          alt="Event audience"
          fill
          className={styles.backgroundImage}
          priority
        />

        <div className={styles.overlay}>
          <div className={styles.rightContent}>
            <h2>Hello Friend</h2>
            <p>
              To keep connected with us, please login with your personal info
            </p>
            <Link href="/register" className={styles.signupButton}>
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
