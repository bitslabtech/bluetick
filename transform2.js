const fs = require('fs');
const path = 'j:/New folder (2)/Bitslab/backup of whatsapp cloud 19-05-2026/Whatsapp cloud/client/src/pages/WaStoreManager/WaStoreSettings.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `                            toast.error('Failed to save settings.');`;
const index = content.indexOf(targetStr);

if (index !== -1) {
    const goodPart = content.substring(0, index + targetStr.length);
    const correctEnding = `
                        } finally { setSavingAuth(false); }
                    }}
                    className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                    {savingAuth ? 'Saving…' : 'Save Account Settings'}
                </button>
            </div>
            </>
            )}
            </div>
        </div>
    );
}`;
    
    fs.writeFileSync(path, goodPart + correctEnding, 'utf8');
    console.log('Fixed syntax error by restoring correct file ending.');
} else {
    console.log('Could not find target string.');
}
