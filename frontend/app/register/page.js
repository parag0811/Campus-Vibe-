import RegisterPanel from "@/components/login-register/register-panel";
import styles from "./register.module.css";
import Image from "next/image";
import registerbg from "@/assets/registerbg.png";
import Link from "next/link";

export default function Register() {

  return (
    <div className={styles.container}>
      {/* Left side - Login */}
      <div className={styles.leftPanel}>
        <Image
          src={registerbg}
          alt="Background"
          fill
          className={styles.backgroundImage}
          priority
        />

        <div className={styles.overlay}>
          <div className={styles.leftContent}>
            <h2>Welcome back</h2>
            <p>To keep connected with us provide us with your information</p>

            <Link href="/login" className={styles.signInButton}>
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Sign Up */}
      <RegisterPanel />
    </div>
  );
}
