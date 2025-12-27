#!/usr/bin/env python3
"""
Mobile Marketplace Codebase Analyzer
Automatically scans the codebase for common issues and generates a report.
"""

import os
import re
import json
import subprocess
from pathlib import Path
from typing import List, Dict, Tuple
from collections import defaultdict

class CodebaseAnalyzer:
    def __init__(self, root_dir: str = "."):
        self.root_dir = Path(root_dir)
        self.issues = defaultdict(list)
        self.stats = defaultdict(int)
        
    def analyze(self) -> Dict:
        """Run all analysis checks"""
        print("🔍 Starting codebase analysis...\n")
        
        self.check_security_issues()
        self.check_git_issues()
        self.check_python_issues()
        self.check_typescript_issues()
        self.check_documentation()
        self.check_dependencies()
        self.check_testing()
        
        return self.generate_report()
    
    def check_security_issues(self):
        """Check for security vulnerabilities"""
        print("🔐 Checking security issues...")
        
        # Check for .env in Git
        if (self.root_dir / ".env").exists():
            gitignore_path = self.root_dir / ".gitignore"
            if not gitignore_path.exists():
                self.add_issue("CRITICAL", "Security", ".env file exists but no .gitignore found")
            else:
                with open(gitignore_path) as f:
                    if ".env" not in f.read():
                        self.add_issue("CRITICAL", "Security", ".env file not in .gitignore")
        
        # Check for hardcoded secrets in Python files
        secret_patterns = [
            r'api_key\s*=\s*["\'][\w-]+["\']',
            r'password\s*=\s*["\'].+["\']',
            r'secret\s*=\s*["\'].+["\']',
            r'token\s*=\s*["\'].+["\']',
        ]
        
        for py_file in self.root_dir.rglob("*.py"):
            if "venv" in str(py_file) or "node_modules" in str(py_file):
                continue
            
            with open(py_file, encoding='utf-8', errors='ignore') as f:
                content = f.read()
                for pattern in secret_patterns:
                    if re.search(pattern, content, re.IGNORECASE):
                        self.add_issue(
                            "CRITICAL", 
                            "Security",
                            f"Potential hardcoded secret in {py_file.relative_to(self.root_dir)}"
                        )
                        break
        
        # Check TypeScript/JavaScript files
        for ts_file in self.root_dir.rglob("*.ts"):
            if "node_modules" in str(ts_file):
                continue
                
            with open(ts_file, encoding='utf-8', errors='ignore') as f:
                content = f.read()
                if re.search(r'apiKey\s*:\s*["\'][\w-]+["\']', content):
                    self.add_issue(
                        "CRITICAL",
                        "Security", 
                        f"Potential hardcoded API key in {ts_file.relative_to(self.root_dir)}"
                    )
    
    def check_git_issues(self):
        """Check for Git-related issues"""
        print("📦 Checking Git issues...")
        
        # Check for temp files
        temp_files = ["temp.py", "temp.js", "test.py", "test.js"]
        for temp_file in temp_files:
            if (self.root_dir / temp_file).exists():
                self.add_issue("HIGH", "Git", f"Temporary file {temp_file} committed to repository")
        
        # Check for large files
        for file_path in self.root_dir.rglob("*"):
            if file_path.is_file() and "node_modules" not in str(file_path):
                size_mb = file_path.stat().st_size / (1024 * 1024)
                if size_mb > 5:
                    self.add_issue(
                        "MEDIUM",
                        "Git",
                        f"Large file {file_path.relative_to(self.root_dir)} ({size_mb:.1f}MB) - consider Git LFS"
                    )
        
        # Check gitignore completeness
        required_ignores = [
            "node_modules", ".env", "*.log", "dist", "build",
            ".DS_Store", "__pycache__", "*.pyc", "venv"
        ]
        
        gitignore_path = self.root_dir / ".gitignore"
        if gitignore_path.exists():
            with open(gitignore_path) as f:
                gitignore_content = f.read()
                for pattern in required_ignores:
                    if pattern not in gitignore_content:
                        self.add_issue(
                            "MEDIUM",
                            "Git",
                            f".gitignore missing pattern: {pattern}"
                        )
        else:
            self.add_issue("CRITICAL", "Git", "No .gitignore file found")
    
    def check_python_issues(self):
        """Check Python code quality"""
        print("🐍 Checking Python issues...")
        
        # Check for requirements.txt
        if not (self.root_dir / "requirements.txt").exists():
            py_files = list(self.root_dir.rglob("*.py"))
            if py_files and not any("venv" in str(f) for f in py_files):
                self.add_issue("HIGH", "Python", "No requirements.txt found")
        
        # Check Python files
        for py_file in self.root_dir.rglob("*.py"):
            if "venv" in str(py_file) or "node_modules" in str(py_file):
                continue
            
            with open(py_file, encoding='utf-8', errors='ignore') as f:
                content = f.read()
                lines = content.split('\n')
                
                # Check file size
                if len(lines) > 500:
                    self.add_issue(
                        "MEDIUM",
                        "Python",
                        f"Large file {py_file.relative_to(self.root_dir)} ({len(lines)} lines)"
                    )
                
                # Check for bare except
                if re.search(r'except\s*:', content):
                    self.add_issue(
                        "HIGH",
                        "Python",
                        f"Bare except clause in {py_file.relative_to(self.root_dir)}"
                    )
                
                # Check for print statements (should use logging)
                print_count = len(re.findall(r'\bprint\s*\(', content))
                if print_count > 5:
                    self.add_issue(
                        "MEDIUM",
                        "Python",
                        f"Many print statements in {py_file.relative_to(self.root_dir)} - use logging"
                    )
                
                # Check for type hints
                function_defs = re.findall(r'def\s+\w+\s*\([^)]*\)', content)
                if function_defs:
                    typed_functions = re.findall(r'def\s+\w+\s*\([^)]*\)\s*->', content)
                    type_coverage = len(typed_functions) / len(function_defs) * 100
                    if type_coverage < 50:
                        self.add_issue(
                            "MEDIUM",
                            "Python",
                            f"Low type hint coverage ({type_coverage:.0f}%) in {py_file.relative_to(self.root_dir)}"
                        )
    
    def check_typescript_issues(self):
        """Check TypeScript code quality"""
        print("📘 Checking TypeScript issues...")
        
        # Check tsconfig.json
        tsconfig_path = self.root_dir / "tsconfig.json"
        if tsconfig_path.exists():
            with open(tsconfig_path) as f:
                try:
                    config = json.load(f)
                    compiler_options = config.get("compilerOptions", {})
                    
                    if not compiler_options.get("strict"):
                        self.add_issue("HIGH", "TypeScript", "strict mode not enabled in tsconfig.json")
                    
                    if not compiler_options.get("noImplicitAny"):
                        self.add_issue("MEDIUM", "TypeScript", "noImplicitAny not enabled")
                        
                except json.JSONDecodeError:
                    self.add_issue("HIGH", "TypeScript", "Invalid tsconfig.json")
        
        # Check TypeScript files
        any_type_count = 0
        for ts_file in self.root_dir.rglob("*.ts"):
            if "node_modules" in str(ts_file):
                continue
            
            with open(ts_file, encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
                # Count 'any' usage
                any_count = len(re.findall(r':\s*any\b', content))
                any_type_count += any_count
                
                if any_count > 5:
                    self.add_issue(
                        "HIGH",
                        "TypeScript",
                        f"Excessive 'any' usage ({any_count}) in {ts_file.relative_to(self.root_dir)}"
                    )
                
                # Check for console.log
                console_count = len(re.findall(r'console\.(log|debug|info)', content))
                if console_count > 3:
                    self.add_issue(
                        "LOW",
                        "TypeScript",
                        f"Many console.log statements in {ts_file.relative_to(self.root_dir)}"
                    )
        
        self.stats["any_types"] = any_type_count
    
    def check_documentation(self):
        """Check documentation completeness"""
        print("📝 Checking documentation...")
        
        readme_path = self.root_dir / "README.md"
        if readme_path.exists():
            with open(readme_path) as f:
                readme_content = f.read()
                
                if len(readme_content) < 500:
                    self.add_issue("MEDIUM", "Documentation", "README.md is too brief")
                
                required_sections = ["Installation", "Usage", "Setup"]
                for section in required_sections:
                    if section.lower() not in readme_content.lower():
                        self.add_issue(
                            "LOW",
                            "Documentation",
                            f"README.md missing '{section}' section"
                        )
        else:
            self.add_issue("HIGH", "Documentation", "No README.md found")
        
        # Check for .env.example
        if not (self.root_dir / ".env.example").exists():
            self.add_issue("MEDIUM", "Documentation", "No .env.example file")
    
    def check_dependencies(self):
        """Check dependency management"""
        print("📚 Checking dependencies...")
        
        package_json_path = self.root_dir / "package.json"
        if package_json_path.exists():
            with open(package_json_path) as f:
                try:
                    package_data = json.load(f)
                    
                    # Check for lockfile
                    if not (self.root_dir / "package-lock.json").exists() and \
                       not (self.root_dir / "yarn.lock").exists():
                        self.add_issue("HIGH", "Dependencies", "No package lock file found")
                    
                    # Count dependencies
                    deps = package_data.get("dependencies", {})
                    dev_deps = package_data.get("devDependencies", {})
                    total_deps = len(deps) + len(dev_deps)
                    
                    if total_deps > 50:
                        self.add_issue(
                            "MEDIUM",
                            "Dependencies",
                            f"Large number of dependencies ({total_deps})"
                        )
                    
                    self.stats["npm_dependencies"] = total_deps
                    
                except json.JSONDecodeError:
                    self.add_issue("CRITICAL", "Dependencies", "Invalid package.json")
        
        # Check npm audit
        try:
            result = subprocess.run(
                ["npm", "audit", "--json"],
                cwd=self.root_dir,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                audit_data = json.loads(result.stdout)
                vulnerabilities = audit_data.get("metadata", {}).get("vulnerabilities", {})
                
                critical = vulnerabilities.get("critical", 0)
                high = vulnerabilities.get("high", 0)
                
                if critical > 0:
                    self.add_issue(
                        "CRITICAL",
                        "Dependencies",
                        f"{critical} critical security vulnerabilities found"
                    )
                
                if high > 0:
                    self.add_issue(
                        "HIGH",
                        "Dependencies",
                        f"{high} high security vulnerabilities found"
                    )
                
        except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
            pass
    
    def check_testing(self):
        """Check testing infrastructure"""
        print("🧪 Checking testing setup...")
        
        # Check for test directories
        test_dirs = ["tests", "test", "__tests__"]
        has_tests = any((self.root_dir / td).exists() for td in test_dirs)
        
        if not has_tests:
            self.add_issue("CRITICAL", "Testing", "No test directory found")
        
        # Check for test files
        test_files = list(self.root_dir.rglob("*.test.ts")) + \
                    list(self.root_dir.rglob("*.test.tsx")) + \
                    list(self.root_dir.rglob("test_*.py"))
        
        if not test_files:
            self.add_issue("CRITICAL", "Testing", "No test files found")
        
        self.stats["test_files"] = len(test_files)
        
        # Check for Jest config
        if not any((self.root_dir / f).exists() for f in ["jest.config.js", "jest.config.ts"]):
            if (self.root_dir / "package.json").exists():
                self.add_issue("HIGH", "Testing", "No Jest configuration found")
        
        # Check for pytest config
        if not any((self.root_dir / f).exists() for f in ["pytest.ini", "pyproject.toml"]):
            if list(self.root_dir.rglob("*.py")):
                self.add_issue("HIGH", "Testing", "No pytest configuration found")
    
    def add_issue(self, severity: str, category: str, message: str):
        """Add an issue to the report"""
        self.issues[severity].append({
            "category": category,
            "message": message
        })
    
    def generate_report(self) -> Dict:
        """Generate final report"""
        report = {
            "summary": {
                "critical": len(self.issues["CRITICAL"]),
                "high": len(self.issues["HIGH"]),
                "medium": len(self.issues["MEDIUM"]),
                "low": len(self.issues["LOW"]),
                "total": sum(len(issues) for issues in self.issues.values())
            },
            "issues": dict(self.issues),
            "stats": dict(self.stats)
        }
        
        return report
    
    def print_report(self, report: Dict):
        """Print formatted report"""
        print("\n" + "="*80)
        print("📊 CODEBASE ANALYSIS REPORT")
        print("="*80 + "\n")
        
        # Summary
        summary = report["summary"]
        print("SUMMARY:")
        print(f"  🔴 Critical Issues: {summary['critical']}")
        print(f"  🟠 High Priority:   {summary['high']}")
        print(f"  🟡 Medium Priority: {summary['medium']}")
        print(f"  🟢 Low Priority:    {summary['low']}")
        print(f"  📊 Total Issues:    {summary['total']}\n")
        
        # Issues by severity
        severity_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
        severity_icons = {
            "CRITICAL": "🔴",
            "HIGH": "🟠",
            "MEDIUM": "🟡",
            "LOW": "🟢"
        }
        
        for severity in severity_order:
            if severity in report["issues"] and report["issues"][severity]:
                print(f"\n{severity_icons[severity]} {severity} ISSUES:")
                print("-" * 80)
                
                # Group by category
                by_category = defaultdict(list)
                for issue in report["issues"][severity]:
                    by_category[issue["category"]].append(issue["message"])
                
                for category, messages in by_category.items():
                    print(f"\n  {category}:")
                    for msg in messages:
                        print(f"    • {msg}")
        
        # Statistics
        if report["stats"]:
            print("\n" + "="*80)
            print("📈 STATISTICS:")
            print("-" * 80)
            for key, value in report["stats"].items():
                print(f"  {key}: {value}")
        
        # Recommendations
        print("\n" + "="*80)
        print("💡 RECOMMENDATIONS:")
        print("-" * 80)
        
        if summary["critical"] > 0:
            print("  🚨 URGENT: Address critical security issues immediately!")
            print("     These could expose your application to serious vulnerabilities.")
        
        if summary["high"] > 0:
            print("\n  ⚠️  HIGH PRIORITY: Fix these issues within 1 week.")
            print("     They significantly impact code quality and maintainability.")
        
        if summary["total"] == 0:
            print("\n  ✅ Great job! Your codebase looks healthy.")
            print("     Continue following best practices.")
        else:
            print("\n  📋 See FIXING_GUIDE.md for detailed solutions to these issues.")
        
        print("\n" + "="*80 + "\n")
    
    def save_report(self, report: Dict, filename: str = "codebase_analysis.json"):
        """Save report to JSON file"""
        with open(self.root_dir / filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📄 Detailed report saved to: {filename}")


def main():
    """Main execution"""
    import sys
    
    root_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    
    analyzer = CodebaseAnalyzer(root_dir)
    report = analyzer.analyze()
    analyzer.print_report(report)
    analyzer.save_report(report)
    
    # Exit with error code if critical issues found
    if report["summary"]["critical"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()