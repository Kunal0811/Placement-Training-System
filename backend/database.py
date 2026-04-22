# backend/database.py
import os
import mysql.connector
from fastapi import Depends
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

# --- Configuration ---
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "placify")

# 1. Config for Legacy (mysql.connector)
db_config = {
    "host": DB_HOST,
    "port": int(DB_PORT),
    "user": DB_USER,
    "password": DB_PASSWORD,
    "database": DB_NAME,
    "ssl_disabled": False  # Crucial for Aiven
}

# 2. Config for SQLAlchemy
SQLALCHEMY_DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# --- SQLAlchemy Setup ---
# 🔥 THE FIX: We MUST pass connect_args to force the driver to use SSL
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    pool_pre_ping=True,
    connect_args={"ssl_disabled": False} 
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_session():
    """Dependency for SQLAlchemy Sessions"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Legacy Setup (For Existing Routes) ---
def get_db():
    """Dependency for Raw MySQL Connections"""
    db = None
    try:
        db = mysql.connector.connect(**db_config)
        yield db
    finally:
        if db:
            db.close()

def get_cursor(db: mysql.connector.MySQLConnection = Depends(get_db)):
    """Dependency for Raw Cursors"""
    cursor = None
    try:
        cursor = db.cursor(dictionary=True)
        yield cursor, db
    finally:
        if cursor:
            cursor.close()