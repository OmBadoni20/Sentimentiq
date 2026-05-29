To: [IT Support Email]
CC: [Your Manager's Email]

Subject: Request for Python Development 
         Environment Setup — ML Project

Dear IT Support Team,

I hope this email finds you well.

I am currently working on a Machine Learning 
project and I am facing technical issues on 
my office laptop that are blocking my work. 
I request your assistance in resolving the 
following issues at the earliest.

================================================
ISSUE 1 — Windows Long Path Support Disabled
================================================

Error Message Received:
"Could not install packages due to OSError 
Errno 2, No such file or directory. This 
error might have occurred since this system 
does not have Windows Long Path Support 
enabled."

What I Need:
Please enable Long Path Support on my laptop 
by running the following command as 
administrator:

reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f

================================================
ISSUE 2 — SSL Certificate Block
================================================

Error Message Received:
"SSL Certificate verification failed"

What I Need:
Please whitelist the following websites 
in company firewall:

1. pypi.org
2. files.pythonhosted.org
3. pypi.python.org
4. huggingface.co
5. cdn-lfs.huggingface.co

These are standard Python package repositories 
and AI model hosting platforms required for 
ML development.

================================================
ISSUE 3 — PowerShell Execution Policy
================================================

Error Message Received:
"File cannot be loaded because running 
scripts is disabled on this system."

What I Need:
Please enable script execution policy 
for my user account:

Set-ExecutionPolicy RemoteSigned 
-Scope CurrentUser

================================================
MY LAPTOP DETAILS
================================================

Name     : Om Shailendrabadoni
OS       : Windows 10/11
Laptop   : Dell
Location : NTT Ltd Office

================================================
BUSINESS JUSTIFICATION
================================================

These tools are required for an internal 
Machine Learning project. All processing 
happens locally on my laptop. No sensitive 
data is shared externally. All tools are 
standard open source development tools.

Tools Required:
- Python 3.11 (already installed)
- pip packages: pandas, scikit-learn,
  matplotlib, seaborn, numpy
- Node.js LTS (already installed)
- npm packages: react, vite, axios

================================================
IMPACT
================================================

Until these issues are resolved I am unable 
to proceed with the ML project development 
which is impacting project timelines.

Estimated IT fix time: 15-20 minutes

================================================

I would really appreciate if this could be 
resolved at the earliest.

Please feel free to contact me if you need 
any additional information or remote access 
to my laptop.

Thank you for your time and support.

Best Regards,
Om Shailendrabadoni
NTT Ltd
[Your Phone Number]
[Your Employee ID]
