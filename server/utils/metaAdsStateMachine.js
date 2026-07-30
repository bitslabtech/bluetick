/**
 * Meta Ads Campaign State Machine
 * Validates whether a requested transition is allowed.
 * 
 * Valid States: 'Draft', 'Published', 'Active', 'Paused', 'Error'
 */

const VALID_TRANSITIONS = {
    'Draft': ['Active', 'Error'], // When publishing, goes to Active (or Error if failed)
    'Error': ['Active', 'Draft'], // Can retry publish (Active) or save as Draft again
    'Active': ['Paused', 'Error'], // Can pause, or Meta webhook might report error
    'Paused': ['Active', 'Error'], // Can resume, or Meta might report error
    'Published': ['Active', 'Paused', 'Error'] // Fallback intermediate state
};

function canTransition(currentState, targetState) {
    if (currentState === targetState) return true;
    
    const allowed = VALID_TRANSITIONS[currentState];
    if (!allowed) return false;
    
    return allowed.includes(targetState);
}

module.exports = {
    canTransition,
    VALID_TRANSITIONS
};
