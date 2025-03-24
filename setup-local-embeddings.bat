@echo off
setlocal

echo ===== PSADT Pro UI Local Embeddings Setup =====
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Python is not installed or not in PATH.
    echo Please install Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    exit /b 1
)

echo Python is installed.
echo.

REM Create virtual environment
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
) else (
    echo Virtual environment already exists.
)

REM Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat

REM Install required packages
echo Installing required packages...
pip install -r python-requirements.txt

REM Check for CUDA
echo Checking for CUDA support...
python -c "import torch; print('CUDA available:', torch.cuda.is_available())" > cuda_check.txt
set /p CUDA_AVAILABLE=<cuda_check.txt
del cuda_check.txt

if "%CUDA_AVAILABLE%"=="CUDA available: True" (
    echo CUDA is available. Would you like to install PyTorch with CUDA support?
    echo This will provide better performance for embedding generation.
    
    choice /C YN /M "Install PyTorch with CUDA support"
    
    if %ERRORLEVEL% EQU 1 (
        echo.
        echo Detecting CUDA version...
        
        REM Try to detect CUDA version using nvidia-smi
        nvidia-smi --query-gpu=driver_version --format=csv,noheader > cuda_version.txt
        
        for /f "delims=" %%a in (cuda_version.txt) do (
            set DRIVER_VERSION=%%a
        )
        del cuda_version.txt
        
        echo NVIDIA Driver Version: %DRIVER_VERSION%
        echo.
        
        echo Select CUDA version to install:
        echo 1. CUDA 11.7 (For driver version 450.80.02 or higher)
        echo 2. CUDA 11.8 (For driver version 450.80.02 or higher)
        echo 3. CUDA 12.1 (For driver version 530.30.02 or higher)
        
        choice /C 123 /M "Select CUDA version"
        
        if %ERRORLEVEL% EQU 1 (
            echo Installing PyTorch with CUDA 11.7 support...
            pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu117
        ) else if %ERRORLEVEL% EQU 2 (
            echo Installing PyTorch with CUDA 11.8 support...
            pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
        ) else if %ERRORLEVEL% EQU 3 (
            echo Installing PyTorch with CUDA 12.1 support...
            pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
        )
    ) else (
        echo Skipping CUDA-enabled PyTorch installation.
    )
) else (
    echo CUDA is not available. Using CPU-only version.
)

echo.
echo Verifying installation...
python -c "import sentence_transformers; import torch; print('All packages installed successfully')"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Setting environment variables...
    
    REM Get the full path to the Python executable in the virtual environment
    set VENV_PYTHON=%CD%\.venv\Scripts\python.exe
    echo Python path: %VENV_PYTHON%
    
    REM Ask if user wants to set system-wide environment variables
    echo Would you like to set the PSADT_PYTHON_PATH environment variable?
    echo This will help the application find your Python installation.
    
    choice /C YN /M "Set environment variable"
    
    if %ERRORLEVEL% EQU 1 (
        choice /C SU /M "Set for [S]ystem (requires admin) or [U]ser only"
        
        if %ERRORLEVEL% EQU 1 (
            echo Setting system-wide environment variable (requires admin)...
            setx PSADT_PYTHON_PATH "%VENV_PYTHON%" /M
            echo Environment variable set for all users.
        ) else (
            echo Setting user environment variable...
            setx PSADT_PYTHON_PATH "%VENV_PYTHON%"
            echo Environment variable set for current user only.
        )
        
        echo To apply this change, you'll need to restart any command prompts or applications.
    ) else (
        echo Skipping environment variable setup.
        echo.
        echo You can manually set PSADT_PYTHON_PATH to: %VENV_PYTHON%
    )
    
    echo.
    echo ===== Setup Complete =====
    echo The local embedding service is now ready to use.
    echo.
    echo Next steps:
    echo 1. Start the PSADT Pro UI application
    echo 2. The application will automatically use the local embedding service
    echo.
    echo For troubleshooting, refer to LOCAL-EMBEDDINGS-README.md
) else (
    echo.
    echo ===== Setup Failed =====
    echo There was an error installing the required packages.
    echo Please check the error messages above and refer to LOCAL-EMBEDDINGS-README.md for troubleshooting.
)

REM Deactivate virtual environment
call .venv\Scripts\deactivate.bat

endlocal
